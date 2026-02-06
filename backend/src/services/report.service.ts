import prisma from '../config/database.js';

interface ProjectCompletionReport {
  projectId: string;
  generatedAt: Date;
  projectSummary: {
    name: string;
    address: string;
    city?: string;
    state?: string;
    clientName?: string;
    clientEmail?: string;
    designerName?: string;
    projectType?: string;
    status: string;
    startDate?: Date;
    completedDate?: Date;
  };
  financialSummary: {
    estimatedTotal: number;
    actualTotal: number;
    variance: number;
    variancePercent: number;
    totalPaid: number;
    balance: number;
  };
  paymentHistory: Array<{
    id: string;
    amount: number;
    status: string;
    paidAt?: Date;
    notes?: string;
  }>;
  materialsSummary: {
    totalItems: number;
    itemsPurchased: number;
    itemsDelivered: number;
    itemsInstalled: number;
    estimatedMaterialCost: number;
    actualMaterialCost: number;
  };
  materials: Array<{
    name: string;
    quantity: number;
    estimatedCost?: number;
    actualCost?: number;
    status: string;
  }>;
  tasksSummary: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  tasks: Array<{
    title: string;
    status: string;
    completedAt?: Date;
  }>;
  dailyLogsSummary: {
    totalLogs: number;
    totalHoursWorked: number;
    dateRange: {
      start?: Date;
      end?: Date;
    };
  };
  timeline: Array<{
    date: Date;
    event: string;
    type: 'milestone' | 'task' | 'payment' | 'material' | 'log';
  }>;
}

export async function generateProjectCompletionReport(projectId: string): Promise<ProjectCompletionReport> {
  // Fetch all project data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      designer: true,
      estimates: {
        where: { status: 'approved' },
        orderBy: { version: 'desc' },
        take: 1,
        include: {
          sections: {
            include: {
              lineItems: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'asc' },
      },
      materialItems: {
        orderBy: { createdAt: 'asc' },
      },
      tasks: {
        orderBy: { sortOrder: 'asc' },
      },
      dailyLogs: {
        orderBy: { date: 'asc' },
      },
    },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  const approvedEstimate = project.estimates[0];

  // Calculate financial summary
  const estimatedTotal = approvedEstimate ? Number(approvedEstimate.total) : 0;
  const totalPaid = project.payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Calculate actual costs from materials
  const actualMaterialCost = project.materialItems.reduce(
    (sum, m) => sum + Number(m.actualCost || 0),
    0
  );

  // For now, actual total is estimated + material variance
  const estimatedMaterialCost = project.materialItems.reduce(
    (sum, m) => sum + Number(m.estimatedCost || 0),
    0
  );
  const materialVariance = actualMaterialCost - estimatedMaterialCost;
  const actualTotal = estimatedTotal + materialVariance;
  const variance = actualTotal - estimatedTotal;
  const variancePercent = estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : 0;

  // Materials summary
  const materialsSummary = {
    totalItems: project.materialItems.length,
    itemsPurchased: project.materialItems.filter((m) =>
      ['ordered', 'shipped', 'delivered', 'installed'].includes(m.purchaseStatus)
    ).length,
    itemsDelivered: project.materialItems.filter((m) =>
      ['delivered', 'installed'].includes(m.purchaseStatus)
    ).length,
    itemsInstalled: project.materialItems.filter((m) => m.purchaseStatus === 'installed').length,
    estimatedMaterialCost,
    actualMaterialCost,
  };

  // Tasks summary
  const completedTasks = project.tasks.filter((t) => t.status === 'completed').length;
  const tasksSummary = {
    totalTasks: project.tasks.length,
    completedTasks,
    pendingTasks: project.tasks.filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
      .length,
    completionRate: project.tasks.length > 0 ? (completedTasks / project.tasks.length) * 100 : 100,
  };

  // Daily logs summary
  const totalHoursWorked = project.dailyLogs.reduce(
    (sum, log) => sum + Number(log.hoursWorked || 0),
    0
  );
  const logDates = project.dailyLogs.map((l) => l.date).sort((a, b) => a.getTime() - b.getTime());
  const dailyLogsSummary = {
    totalLogs: project.dailyLogs.length,
    totalHoursWorked,
    dateRange: {
      start: logDates[0] || undefined,
      end: logDates[logDates.length - 1] || undefined,
    },
  };

  // Build timeline
  const timeline: ProjectCompletionReport['timeline'] = [];

  // Add project milestones
  if (project.createdAt) {
    timeline.push({
      date: project.createdAt,
      event: 'Project created',
      type: 'milestone',
    });
  }

  if (approvedEstimate?.approvedAt) {
    timeline.push({
      date: approvedEstimate.approvedAt,
      event: 'Estimate approved',
      type: 'milestone',
    });
  }

  // Add payment events
  project.payments.forEach((payment) => {
    if (payment.paidAt) {
      timeline.push({
        date: payment.paidAt,
        event: `Payment received: $${Number(payment.amount).toLocaleString()}`,
        type: 'payment',
      });
    }
  });

  // Add material events
  project.materialItems.forEach((material) => {
    if (material.deliveredAt) {
      timeline.push({
        date: material.deliveredAt,
        event: `Material delivered: ${material.name}`,
        type: 'material',
      });
    }
    if (material.installedAt) {
      timeline.push({
        date: material.installedAt,
        event: `Material installed: ${material.name}`,
        type: 'material',
      });
    }
  });

  // Add task completion events
  project.tasks.forEach((task) => {
    if (task.completedAt) {
      timeline.push({
        date: task.completedAt,
        event: `Task completed: ${task.title}`,
        type: 'task',
      });
    }
  });

  // Add daily log entries
  project.dailyLogs.forEach((log) => {
    timeline.push({
      date: log.date,
      event: `Daily log: ${log.summary}`,
      type: 'log',
    });
  });

  // Sort timeline by date
  timeline.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    projectId,
    generatedAt: new Date(),
    projectSummary: {
      name: project.name,
      address: project.address || '',
      city: project.city || undefined,
      state: project.state || undefined,
      clientName: project.client?.name || undefined,
      clientEmail: project.client?.email || undefined,
      designerName: project.designer?.name || undefined,
      projectType: project.projectType || undefined,
      status: project.status,
      startDate: project.startDate || undefined,
      completedDate: project.completedAt || undefined,
    },
    financialSummary: {
      estimatedTotal,
      actualTotal,
      variance,
      variancePercent,
      totalPaid,
      balance: actualTotal - totalPaid,
    },
    paymentHistory: project.payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      status: p.status,
      paidAt: p.paidAt || undefined,
      notes: p.notes || undefined,
    })),
    materialsSummary,
    materials: project.materialItems.map((m) => ({
      name: m.name,
      quantity: Number(m.quantity),
      estimatedCost: m.estimatedCost ? Number(m.estimatedCost) : undefined,
      actualCost: m.actualCost ? Number(m.actualCost) : undefined,
      status: m.purchaseStatus,
    })),
    tasksSummary,
    tasks: project.tasks.map((t) => ({
      title: t.title,
      status: t.status,
      completedAt: t.completedAt || undefined,
    })),
    dailyLogsSummary,
    timeline,
  };
}

export async function markProjectCompleted(projectId: string): Promise<void> {
  // Validate all tasks are completed
  const incompleteTasks = await prisma.projectTask.count({
    where: {
      projectId,
      status: { notIn: ['completed', 'cancelled'] },
    },
  });

  if (incompleteTasks > 0) {
    throw new Error(`Cannot complete project: ${incompleteTasks} tasks are not completed`);
  }

  // Update project status
  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });
}
