import { Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { CreateCategorySchema } from '../../types/schemas.js';
import { successResponse } from '../../utils/response.js';
import { NotFoundError } from '../../utils/errors.js';

// ==========================================
// GET ALL CATEGORIES
// ==========================================
export async function getCategories(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          campaigns: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
  });

  const result = categories.map(cat => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    icon: cat.icon,
    color: cat.color,
    campaignCount: cat._count.campaigns,
  }));

  res.json(successResponse(result));
}

// ==========================================
// GET SINGLE CATEGORY
// ==========================================
export async function getCategory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { slug } = req.params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      campaigns: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          currentAmount: true,
          targetAmount: true,
          donorCount: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          campaigns: { where: { status: 'ACTIVE' } },
        },
      },
    },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  res.json(successResponse({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    color: category.color,
    campaignCount: category._count.campaigns,
    campaigns: category.campaigns.map(c => ({
      ...c,
      currentAmount: c.currentAmount.toString(),
      targetAmount: c.targetAmount.toString(),
    })),
  }));
}

// ==========================================
// CREATE CATEGORY (Admin only)
// ==========================================
export async function createCategory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const input = CreateCategorySchema.parse(req.body);

  const category = await prisma.category.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sortOrder ?? 0,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'category.create',
      entityType: 'category',
      entityId: category.id,
      adminUserId: req.user?.id,
      newValue: category as any,
    },
  });

  res.status(201).json(successResponse(category));
}

// ==========================================
// UPDATE CATEGORY (Admin only)
// ==========================================
export async function updateCategory(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const input = CreateCategorySchema.partial().parse(req.body);

  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new NotFoundError('Category');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: input,
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'category.update',
      entityType: 'category',
      entityId: category.id,
      adminUserId: req.user?.id,
      oldValue: category as any,
      newValue: updated as any,
    },
  });

  res.json(successResponse(updated));
}
