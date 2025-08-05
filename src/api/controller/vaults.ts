// controllers/vaultController.ts

import expressAsyncHandler from 'express-async-handler';
import prisma from '../prisma-client';

export const registerVault = expressAsyncHandler(async (req, res) => {
  const {
    name,
    contractAddress,
    description,
    tag,
    apy,
    riskLevel,
    tvl,
    network,
    logoUrl,
    strategyIds, // <- optional array of existing strategy IDs
  } = req.body;

  if (!name || !contractAddress || !network) {
    res.status(400).json({
      message: 'name, contractAddress, and network are required.',
    });
    return;
  }

  const existingVault = await prisma.vault.findUnique({
    where: { contractAddress },
  });

  if (existingVault) {
    res.status(200).json({
      message: 'Vault already exists.',
      vault: existingVault,
    });
    return;
  }

  const vault = await prisma.vault.create({
    data: {
      name,
      contractAddress,
      description,
      tag,
      apy,
      riskLevel,
      tvl,
      network,
      logoUrl,
      strategies: strategyIds?.length
        ? {
            create: strategyIds.map((strategyId: string) => ({
              strategy: { connect: { id: strategyId } },
            })),
          }
        : undefined,
    },
  });

  res.status(201).json({
    message: 'Vault created and linked to strategies.',
    vault,
  });
});

export const followVault = expressAsyncHandler(async (req, res) => {
  const { userId, vaultId } = req.body;

  if (!userId || !vaultId) {
    res.status(400).json({
      message: 'Missing userId or vaultId.',
    });
    return;
  }

  // Check if vault exists
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
  });

  if (!vault) {
    res.status(404).json({ message: 'Vault not found.' });
    return;
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  // Prevent duplicate follows
  const existingFollow = await prisma.follow.findFirst({
    where: {
      userId,
      vaultId,
    },
  });

  if (existingFollow) {
    res.status(200).json({
      message: 'Already following this vault.',
    });
    return;
  }

  // Create follow
  const follow = await prisma.follow.create({
    data: {
      userId,
      vaultId,
    },
  });

  res.status(201).json({
    message: 'Vault followed successfully.',
    follow,
  });
});

//  Follwing Checker
export const isUserFollowingVault = expressAsyncHandler(async (req, res) => {
  const { userId, walletAddress, vaultId } = req.query;

  if (!vaultId || (!userId && !walletAddress)) {
    res.status(400).json({ message: 'Missing vaultId and user identifier.' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(userId && { id: String(userId) }),
      ...(walletAddress && { walletAddress: String(walletAddress) }),
    },
    select: { id: true },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  const follow = await prisma.follow.findFirst({
    where: {
      userId: user.id,
      vaultId: String(vaultId),
    },
  });

  res.status(200).json({
    following: !!follow,
  });
});

export const getUserPoints = expressAsyncHandler(async (req, res) => {
  const { walletAddress, userId } = req.query;

  if (!walletAddress && !userId) {
    res.status(400).json({ message: 'Missing identifier.' });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(walletAddress && { walletAddress: String(walletAddress) }),
      ...(userId && { id: String(userId) }),
    },
    select: {
      id: true,
      points: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: 'User not found.' });
    return;
  }

  res.status(200).json({
    points: user.points,
  });
});

// Get vaults by id
export const getVaultStatsQuickView = expressAsyncHandler(async (req, res) => {
  const { vaultId } = req.query;

  if (!vaultId) {
    res.status(400).json({ message: 'Missing vaultId' });
    return;
  }

  const vault = await prisma.vault.findUnique({
    where: { id: String(vaultId) },
    select: {
      id: true,
      name: true,
      description: true,
      tvl: true,
      apy: true,
      contractAddress: true,
      strategies: {
        select: {
          name: true,
        },
      },
      riskLevel: true,
      metrics: {
        select: {
          apy: true,
          date: true,
        },
      },
      _count: {
        select: {
          followers: true,
        },
      },
    },
  });

  if (!vault) {
    res.status(404).json({ message: 'Vault not found' });
    return;
  }

  res.status(200).json({
    vaultId: vault.id,
    name: vault.name,
    address: vault.contractAddress,
    tvl: vault.tvl,
    apy: vault.apy,
    riskLevel: vault.riskLevel,
    followersCount: vault._count.followers,
    marucs: vault.metrics,
  });
});

export const getVaults = expressAsyncHandler(async (req, res) => {
  const { vaultId } = req.query;

  // If vaultId is provided, return a specific vault
  if (vaultId) {
    const vault = await prisma.vault.findUnique({
      where: { id: String(vaultId) },
      select: {
        id: true,
        name: true,
        description: true,
        tvl: true,
        apy: true,
        tag: true,
        logoUrl: true,
        asset: true,
        contractAddress: true,
        strategies: {
          select: { name: true },
        },
        riskLevel: true,
        metrics: {
          select: { apy: true, date: true },
        },
        _count: {
          select: { followers: true },
        },
      },
    });

    if (!vault) {
      res.status(404).json({ message: 'Vault not found' });
      return;
    }

    res.status(200).json({
      vaultId: vault.id,
      name: vault.name,
      address: vault.contractAddress,
      description: vault.description,
      tvl: vault.tvl,
      asset: vault.asset,
      tag: vault.tag,
      logo: vault.logoUrl,
      apy: vault.apy,
      riskLevel: vault.riskLevel,
      followersCount: vault._count.followers,
      metrics: vault.metrics,
    });
  }

  // If vaultId is not provided, return all vaults
  const allVaults = await prisma.vault.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      tvl: true,
      apy: true,
      tag: true,
      asset: true,
      logoUrl: true,
      contractAddress: true,
      strategies: {
        select: { name: true },
      },
      riskLevel: true,
      metrics: {
        select: { apy: true, date: true },
      },
      _count: {
        select: { followers: true },
      },
    },
  });

  const formatted = allVaults.map((vault) => ({
    vaultId: vault.id,
    name: vault.name,
    description: vault.description,
    address: vault.contractAddress,
    tvl: vault.tvl,
    tag: vault.tag,
    asset: vault.asset,
    apy: vault.apy,
    logo: vault.logoUrl,
    riskLevel: vault.riskLevel,
    followersCount: vault._count.followers,
    metrics: vault.metrics,
  }));

  res.status(200).json(formatted);
});

export const hasUserInteractedWithVault = expressAsyncHandler(
  async (req, res) => {
    const { userId, vaultId } = req.query;

    if (!userId || !vaultId) {
      res.status(400).json({ message: 'Missing identifiers.' });
      return;
    }

    const interaction = await prisma.vaultInteraction.findFirst({
      where: {
        userId: String(userId),
        vaultId: String(vaultId),
      },
      select: { id: true },
    });

    res.status(200).json({
      interacted: !!interaction,
    });
  },
);
