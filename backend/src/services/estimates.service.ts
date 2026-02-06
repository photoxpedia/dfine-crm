import prisma from '../config/database.js';
import { Prisma, EstimateStatus, UnitOfMeasure } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Utility functions
function toDecimal(value: number | string | Decimal): Decimal {
  return new Prisma.Decimal(value);
}

function decimalToNumber(value: Decimal | null): number {
  return value ? parseFloat(value.toString()) : 0;
}

// Calculate selling price from contractor cost and margin percentage
export function calculateSellingPrice(contractorCost: number, marginPercentage: number): number {
  // Selling price = Contractor cost / (1 - margin/100)
  // For 40% margin: selling = cost / 0.6
  const margin = marginPercentage / 100;
  if (margin >= 1) return contractorCost * 2; // Safety check
  return contractorCost / (1 - margin);
}

// Calculate margin percentage from contractor cost and selling price
export function calculateMarginPercentage(contractorCost: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0;
  return ((sellingPrice - contractorCost) / sellingPrice) * 100;
}

// Calculate line item totals
export function calculateLineItemTotals(
  quantity: number,
  contractorCost: number,
  sellingPrice: number
): { totalContractor: number; totalSelling: number } {
  return {
    totalContractor: quantity * contractorCost,
    totalSelling: quantity * sellingPrice,
  };
}

// Create a new estimate for a project
export async function createEstimate(projectId: string, marginPercentage: number = 40, name?: string) {
  // Get the latest version number
  const latestEstimate = await prisma.estimate.findFirst({
    where: { projectId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const version = (latestEstimate?.version || 0) + 1;

  const estimate = await prisma.estimate.create({
    data: {
      projectId,
      version,
      marginPercentage: toDecimal(marginPercentage),
      name: name || `Estimate v${version}`,
    },
    include: {
      sections: { include: { lineItems: true } },
    },
  });

  return estimate;
}

// Create estimate from pricing template
export async function createEstimateFromTemplate(
  projectId: string,
  templateType: 'bathroom' | 'kitchen' | 'general',
  marginPercentage: number = 40
) {
  const estimate = await createEstimate(projectId, marginPercentage);

  // Get all active categories for this template type
  const categories = await prisma.pricingCategory.findMany({
    where: {
      projectType: templateType,
      isActive: true,
    },
    include: {
      items: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  // Create sections for each category
  for (let i = 0; i < categories.length; i++) {
    const category = categories[i];
    await prisma.estimateSection.create({
      data: {
        estimateId: estimate.id,
        categoryId: category.id,
        name: category.name,
        sortOrder: i,
      },
    });
  }

  return getEstimate(estimate.id);
}

// Get estimate with all details
export async function getEstimate(estimateId: string) {
  return prisma.estimate.findUnique({
    where: { id: estimateId },
    include: {
      project: {
        select: { id: true, name: true, designerId: true, clientId: true, projectType: true },
      },
      sections: {
        include: {
          category: { select: { id: true, name: true } },
          lineItems: {
            include: {
              pricingItem: { select: { id: true, name: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
}

// Add section to estimate
export async function addSection(estimateId: string, name: string, categoryId?: string) {
  const maxOrder = await prisma.estimateSection.aggregate({
    where: { estimateId },
    _max: { sortOrder: true },
  });

  return prisma.estimateSection.create({
    data: {
      estimateId,
      categoryId,
      name,
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
    },
    include: { lineItems: true },
  });
}

// Add line item to section
export async function addLineItem(
  sectionId: string,
  data: {
    pricingItemId?: string;
    name: string;
    description?: string;
    unitOfMeasure?: UnitOfMeasure;
    quantity?: number;
    contractorCost?: number;
    sellingPrice?: number;
    productUrl?: string;
    imageUrl?: string;
    notes?: string;
  }
) {
  const section = await prisma.estimateSection.findUnique({
    where: { id: sectionId },
    include: { estimate: { select: { marginPercentage: true } } },
  });

  if (!section) throw new Error('Section not found');

  // If using a pricing item, get its values
  let itemData = { ...data };
  if (data.pricingItemId) {
    const pricingItem = await prisma.pricingItem.findUnique({
      where: { id: data.pricingItemId },
    });
    if (pricingItem) {
      itemData = {
        ...itemData,
        name: data.name || pricingItem.name,
        description: data.description || pricingItem.description || undefined,
        unitOfMeasure: data.unitOfMeasure || pricingItem.unitOfMeasure,
        contractorCost: data.contractorCost ?? decimalToNumber(pricingItem.contractorCost),
        sellingPrice: data.sellingPrice ?? decimalToNumber(pricingItem.sellingPrice),
      };
    }
  }

  const quantity = itemData.quantity ?? 1; // Default to 1 if not specified
  const contractorCost = itemData.contractorCost ?? 0;
  let sellingPrice = itemData.sellingPrice;

  // If no selling price, calculate from margin
  if (!sellingPrice && contractorCost > 0) {
    const margin = decimalToNumber(section.estimate.marginPercentage);
    sellingPrice = calculateSellingPrice(contractorCost, margin);
  }

  const { totalContractor, totalSelling } = calculateLineItemTotals(
    quantity,
    contractorCost,
    sellingPrice || 0
  );

  const maxOrder = await prisma.estimateLineItem.aggregate({
    where: { sectionId },
    _max: { sortOrder: true },
  });

  const lineItem = await prisma.estimateLineItem.create({
    data: {
      sectionId,
      pricingItemId: itemData.pricingItemId,
      name: itemData.name,
      description: itemData.description,
      unitOfMeasure: itemData.unitOfMeasure || 'EA',
      quantity: toDecimal(quantity),
      contractorCost: toDecimal(contractorCost),
      sellingPrice: toDecimal(sellingPrice || 0),
      totalContractor: toDecimal(totalContractor),
      totalSelling: toDecimal(totalSelling),
      sortOrder: (maxOrder._max.sortOrder || 0) + 1,
      isCustom: !itemData.pricingItemId,
      productUrl: itemData.productUrl,
      imageUrl: itemData.imageUrl,
      notes: itemData.notes,
    },
  });

  // Recalculate section and estimate totals
  await recalculateTotals(section.estimateId);

  return lineItem;
}

// Update line item
export async function updateLineItem(
  lineItemId: string,
  data: {
    name?: string;
    description?: string;
    unitOfMeasure?: UnitOfMeasure;
    quantity?: number;
    contractorCost?: number;
    sellingPrice?: number;
    productUrl?: string;
    imageUrl?: string;
    notes?: string;
  }
) {
  const lineItem = await prisma.estimateLineItem.findUnique({
    where: { id: lineItemId },
    include: {
      section: {
        include: { estimate: { select: { id: true, marginPercentage: true } } },
      },
    },
  });

  if (!lineItem) throw new Error('Line item not found');

  const quantity = data.quantity ?? decimalToNumber(lineItem.quantity);
  const contractorCost = data.contractorCost ?? decimalToNumber(lineItem.contractorCost);
  let sellingPrice = data.sellingPrice;

  // If selling price not provided but contractor cost changed, recalculate
  if (sellingPrice === undefined && data.contractorCost !== undefined) {
    const margin = decimalToNumber(lineItem.section.estimate.marginPercentage);
    sellingPrice = calculateSellingPrice(contractorCost, margin);
  } else if (sellingPrice === undefined) {
    sellingPrice = decimalToNumber(lineItem.sellingPrice);
  }

  const { totalContractor, totalSelling } = calculateLineItemTotals(
    quantity,
    contractorCost,
    sellingPrice
  );

  const updated = await prisma.estimateLineItem.update({
    where: { id: lineItemId },
    data: {
      ...data,
      quantity: data.quantity !== undefined ? toDecimal(quantity) : undefined,
      contractorCost: data.contractorCost !== undefined ? toDecimal(contractorCost) : undefined,
      sellingPrice: sellingPrice !== undefined ? toDecimal(sellingPrice) : undefined,
      totalContractor: toDecimal(totalContractor),
      totalSelling: toDecimal(totalSelling),
    },
  });

  await recalculateTotals(lineItem.section.estimate.id);

  return updated;
}

// Delete line item
export async function deleteLineItem(lineItemId: string) {
  const lineItem = await prisma.estimateLineItem.findUnique({
    where: { id: lineItemId },
    include: { section: { select: { estimateId: true } } },
  });

  if (!lineItem) throw new Error('Line item not found');

  await prisma.estimateLineItem.delete({ where: { id: lineItemId } });
  await recalculateTotals(lineItem.section.estimateId);
}

// Recalculate all totals for an estimate
export async function recalculateTotals(estimateId: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    include: {
      sections: {
        include: { lineItems: true },
      },
    },
  });

  if (!estimate) throw new Error('Estimate not found');

  let totalContractor = 0;
  let totalSelling = 0;

  // Update each section's subtotals
  for (const section of estimate.sections) {
    let sectionContractor = 0;
    let sectionSelling = 0;

    for (const item of section.lineItems) {
      sectionContractor += decimalToNumber(item.totalContractor);
      sectionSelling += decimalToNumber(item.totalSelling);
    }

    await prisma.estimateSection.update({
      where: { id: section.id },
      data: {
        subtotalContractor: toDecimal(sectionContractor),
        subtotalSelling: toDecimal(sectionSelling),
      },
    });

    totalContractor += sectionContractor;
    totalSelling += sectionSelling;
  }

  // Update estimate totals
  await prisma.estimate.update({
    where: { id: estimateId },
    data: {
      subtotalContractor: toDecimal(totalContractor),
      subtotalSelling: toDecimal(totalSelling),
      total: toDecimal(totalSelling),
    },
  });

  return getEstimate(estimateId);
}

// Apply a new margin percentage to all items
export async function applyMarginToEstimate(estimateId: string, marginPercentage: number) {
  const estimate = await prisma.estimate.findUnique({
    where: { id: estimateId },
    include: {
      sections: { include: { lineItems: true } },
    },
  });

  if (!estimate) throw new Error('Estimate not found');

  // Update all line items
  for (const section of estimate.sections) {
    for (const item of section.lineItems) {
      const contractorCost = decimalToNumber(item.contractorCost);
      const quantity = decimalToNumber(item.quantity);
      const newSellingPrice = calculateSellingPrice(contractorCost, marginPercentage);
      const { totalContractor, totalSelling } = calculateLineItemTotals(
        quantity,
        contractorCost,
        newSellingPrice
      );

      await prisma.estimateLineItem.update({
        where: { id: item.id },
        data: {
          sellingPrice: toDecimal(newSellingPrice),
          totalContractor: toDecimal(totalContractor),
          totalSelling: toDecimal(totalSelling),
        },
      });
    }
  }

  // Update estimate margin
  await prisma.estimate.update({
    where: { id: estimateId },
    data: { marginPercentage: toDecimal(marginPercentage) },
  });

  return recalculateTotals(estimateId);
}

// Update estimate status
export async function updateEstimateStatus(estimateId: string, status: EstimateStatus) {
  const updateData: any = { status };

  if (status === 'sent') {
    updateData.sentAt = new Date();
    updateData.validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  } else if (status === 'approved') {
    updateData.approvedAt = new Date();
  }

  return prisma.estimate.update({
    where: { id: estimateId },
    data: updateData,
  });
}

// Duplicate an estimate (for new version)
export async function duplicateEstimate(estimateId: string) {
  const original = await getEstimate(estimateId);
  if (!original) throw new Error('Estimate not found');

  const newEstimate = await createEstimate(
    original.projectId,
    decimalToNumber(original.marginPercentage)
  );

  // Copy sections and line items
  for (const section of original.sections) {
    const newSection = await addSection(newEstimate.id, section.name, section.categoryId || undefined);

    for (const item of section.lineItems) {
      await addLineItem(newSection.id, {
        pricingItemId: item.pricingItemId || undefined,
        name: item.name,
        description: item.description || undefined,
        unitOfMeasure: item.unitOfMeasure,
        quantity: decimalToNumber(item.quantity),
        contractorCost: decimalToNumber(item.contractorCost),
        sellingPrice: decimalToNumber(item.sellingPrice),
        productUrl: item.productUrl || undefined,
        imageUrl: item.imageUrl || undefined,
        notes: item.notes || undefined,
      });
    }
  }

  return getEstimate(newEstimate.id);
}
