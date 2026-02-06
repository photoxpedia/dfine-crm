import prisma from '../config/database.js';
import { LeadEventType, Prisma } from '@prisma/client';

interface CreateHistoryParams {
  leadId: string;
  userId: string;
  eventType: LeadEventType;
  oldValue?: string | null;
  newValue?: string | null;
  note?: string | null;
  metadata?: Record<string, any>;
}

export async function createLeadHistory(params: CreateHistoryParams) {
  return prisma.leadHistory.create({
    data: {
      leadId: params.leadId,
      userId: params.userId,
      eventType: params.eventType,
      oldValue: params.oldValue ?? null,
      newValue: params.newValue ?? null,
      note: params.note ?? null,
      metadata: params.metadata ?? Prisma.JsonNull,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function getLeadHistory(leadId: string, limit = 50, offset = 0) {
  return prisma.leadHistory.findMany({
    where: { leadId },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
