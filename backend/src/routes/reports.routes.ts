import { Router, Request, Response } from 'express';
import { authenticate, requireDesignerOrAdmin } from '../middleware/auth.js';
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

export default router;
