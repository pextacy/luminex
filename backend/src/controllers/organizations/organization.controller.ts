import { Response } from 'express';
import { prisma } from '../../db/prisma.js';
import { AuthenticatedRequest } from '../../types/index.js';
import { CreateOrganizationSchema } from '../../types/schemas.js';
import { successResponse, paginatedResponse } from '../../utils/response.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';
import { PaginationSchema } from '../../types/schemas.js';

// ==========================================
// GET ALL ORGANIZATIONS
// ==========================================
export async function getOrganizations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const query = PaginationSchema.parse(req.query);

  const total = await prisma.organization.count();

  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          campaigns: { where: { status: 'ACTIVE' } },
        },
      },
    },
    orderBy: { name: 'asc' },
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  });

  const result = organizations.map(org => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    logoUrl: org.logoUrl,
    websiteUrl: org.websiteUrl,
    isVerified: org.isVerified,
    verifiedAt: org.verifiedAt,
    campaignCount: org._count.campaigns,
  }));

  res.json(paginatedResponse(result, query.page, query.limit, total));
}

// ==========================================
// GET SINGLE ORGANIZATION
// ==========================================
export async function getOrganization(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { slug } = req.params;

  const organization = await prisma.organization.findUnique({
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
          status: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          campaigns: true,
        },
      },
    },
  });

  if (!organization) {
    throw new NotFoundError('Organization');
  }

  // Calculate total raised across all campaigns
  const totalRaised = await prisma.campaign.aggregate({
    where: { 
      organizationId: organization.id,
      status: { in: ['ACTIVE', 'COMPLETED'] },
    },
    _sum: { currentAmount: true },
  });

  res.json(successResponse({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    walletAddress: organization.walletAddress,
    logoUrl: organization.logoUrl,
    websiteUrl: organization.websiteUrl,
    isVerified: organization.isVerified,
    verifiedAt: organization.verifiedAt,
    campaignCount: organization._count.campaigns,
    totalRaised: totalRaised._sum.currentAmount?.toString() ?? '0',
    campaigns: organization.campaigns.map(c => ({
      ...c,
      currentAmount: c.currentAmount.toString(),
      targetAmount: c.targetAmount.toString(),
    })),
  }));
}

// ==========================================
// CREATE ORGANIZATION (Admin only)
// ==========================================
export async function createOrganization(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const input = CreateOrganizationSchema.parse(req.body);

  // Check for duplicate slug or wallet
  const existing = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: input.slug },
        { walletAddress: input.walletAddress.toLowerCase() },
      ],
    },
  });

  if (existing) {
    throw new ConflictError(
      existing.slug === input.slug 
        ? 'Organization with this slug already exists'
        : 'Organization with this wallet address already exists'
    );
  }

  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      description: input.description,
      walletAddress: input.walletAddress.toLowerCase(),
      logoUrl: input.logoUrl,
      websiteUrl: input.websiteUrl,
      email: input.email,
      country: input.country,
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'organization.create',
      entityType: 'organization',
      entityId: organization.id,
      adminUserId: req.user?.id,
      newValue: organization as any,
    },
  });

  res.status(201).json(successResponse(organization));
}

// ==========================================
// VERIFY ORGANIZATION (Super Admin only)
// ==========================================
export async function verifyOrganization(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { id } = req.params;

  const organization = await prisma.organization.findUnique({
    where: { id },
  });

  if (!organization) {
    throw new NotFoundError('Organization');
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: {
      isVerified: true,
      verifiedAt: new Date(),
    },
  });

  // Log audit
  await prisma.auditLog.create({
    data: {
      action: 'organization.verify',
      entityType: 'organization',
      entityId: organization.id,
      adminUserId: req.user?.id,
      oldValue: { isVerified: false } as any,
      newValue: { isVerified: true, verifiedAt: updated.verifiedAt } as any,
    },
  });

  res.json(successResponse(updated));
}
