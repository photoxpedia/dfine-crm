import { Router, Request, Response } from 'express';
import { authenticate, requireDesignerOrAdmin, requireAdmin } from '../middleware/auth.js';
import prisma from '../config/database.js';
import {
  generateProjectCompletionReport,
  markProjectCompleted,
} from '../services/report.service.js';

const router = Router();

// Generate project completion report
router.get(
  '/projects/:projectId/completion',
  authenticate,
  requireDesignerOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const report = await generateProjectCompletionReport(projectId);
      res.json(report);
    } catch (error) {
      console.error('Error generating completion report:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }
);

// Mark project as completed
router.post(
  '/projects/:projectId/complete',
  authenticate,
  requireDesignerOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      await markProjectCompleted(projectId);
      res.json({ message: 'Project marked as completed' });
    } catch (error) {
      console.error('Error completing project:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to complete project',
      });
    }
  }
);

// Financial report (admin only)
router.get(
  '/financial',
  authenticate,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Get user's org
      const userOrg = await prisma.organizationMember.findFirst({
        where: { userId: req.user!.id, isDefault: true },
        select: { organizationId: true },
      });

      if (!userOrg) {
        res.status(400).json({ error: 'User must belong to an organization' });
        return;
      }

      const orgId = userOrg.organizationId;

      // Revenue by month (last 12 months) - completed payments
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      twelveMonthsAgo.setDate(1);
      twelveMonthsAgo.setHours(0, 0, 0, 0);

      const completedPayments = await prisma.payment.findMany({
        where: {
          status: 'completed',
          project: { organizationId: orgId },
          paidAt: { gte: twelveMonthsAgo },
        },
        select: {
          amount: true,
          paidAt: true,
        },
      });

      // Group payments by month
      const revenueByMonth: { month: string; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        const monthRevenue = completedPayments
          .filter(p => {
            if (!p.paidAt) return false;
            const pd = new Date(p.paidAt);
            return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
          })
          .reduce((sum, p) => sum + Number(p.amount), 0);
        revenueByMonth.push({ month: monthLabel, revenue: monthRevenue });
      }

      // Total revenue (all time)
      const totalRevenueResult = await prisma.payment.aggregate({
        where: {
          status: 'completed',
          project: { organizationId: orgId },
        },
        _sum: { amount: true },
      });
      const totalRevenue = Number(totalRevenueResult._sum.amount || 0);

      // Total estimated (sum of approved estimate totals)
      const totalEstimatedResult = await prisma.estimate.aggregate({
        where: {
          status: 'approved',
          project: { organizationId: orgId },
        },
        _sum: { total: true },
      });
      const totalEstimated = Number(totalEstimatedResult._sum.total || 0);

      // Contractor costs from approved estimates
      const approvedEstimates = await prisma.estimate.findMany({
        where: {
          status: 'approved',
          project: { organizationId: orgId },
        },
        select: {
          sections: {
            select: {
              lineItems: {
                select: { totalContractor: true },
              },
            },
          },
        },
      });

      let totalContractorCost = 0;
      for (const est of approvedEstimates) {
        for (const section of est.sections) {
          for (const item of section.lineItems) {
            totalContractorCost += Number(item.totalContractor || 0);
          }
        }
      }

      const profitMargin = totalEstimated > 0
        ? ((totalEstimated - totalContractorCost) / totalEstimated) * 100
        : 0;

      // Payments by status
      const allPayments = await prisma.payment.findMany({
        where: { project: { organizationId: orgId } },
        select: { status: true, amount: true },
      });

      const paymentsByStatus: { status: string; count: number; total: number }[] = [];
      const statusGroups: Record<string, { count: number; total: number }> = {};
      for (const p of allPayments) {
        if (!statusGroups[p.status]) {
          statusGroups[p.status] = { count: 0, total: 0 };
        }
        statusGroups[p.status].count++;
        statusGroups[p.status].total += Number(p.amount);
      }
      for (const [status, data] of Object.entries(statusGroups)) {
        paymentsByStatus.push({ status, ...data });
      }

      // Top 5 projects by revenue
      const projectPayments = await prisma.payment.groupBy({
        by: ['projectId'],
        where: {
          status: 'completed',
          project: { organizationId: orgId },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      });

      const topProjectIds = projectPayments.map(p => p.projectId);
      const topProjectDetails = await prisma.project.findMany({
        where: { id: { in: topProjectIds } },
        select: { id: true, name: true, status: true },
      });

      const topProjects = projectPayments.map(pp => {
        const project = topProjectDetails.find(p => p.id === pp.projectId);
        return {
          projectId: pp.projectId,
          projectName: project?.name || 'Unknown',
          projectStatus: project?.status || 'unknown',
          revenue: Number(pp._sum.amount || 0),
        };
      });

      // Outstanding payments (pending + processing)
      const outstandingResult = await prisma.payment.aggregate({
        where: {
          status: { in: ['pending', 'processing'] },
          project: { organizationId: orgId },
        },
        _sum: { amount: true },
      });
      const outstandingPayments = Number(outstandingResult._sum.amount || 0);

      res.json({
        revenueByMonth,
        totalRevenue,
        totalEstimated,
        totalContractorCost,
        profitMargin: Math.round(profitMargin * 100) / 100,
        paymentsByStatus,
        topProjects,
        outstandingPayments,
      });
    } catch (error) {
      console.error('Error generating financial report:', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to generate financial report',
      });
    }
  }
);

export default router;
