import { prisma } from './prisma';

export const QUOTA_COSTS = {
  SEARCH: 100,
  VIDEOS: 1,
  CHANNELS: 1,
  PLAYLIST_ITEMS: 1,
};

export const MAX_QUOTA_PER_KEY = 10000;
export const QUOTA_SAFE_LIMIT = 500;

export async function resetExhaustedKeys() {
  const now = new Date();
  
  // Find keys that need reset
  const keys = await prisma.apiKey.findMany({
    where: { isActive: true },
  });

  for (const key of keys) {
    if (new Date(key.quotaResetAt) < now) {
      // Midnight PT is 7-8 hours behind UTC. Next reset logic:
      // Let's accurately find the next midnight PT.
      const reset = getNextMidnightPT();
      await prisma.apiKey.update({
        where: { id: key.id },
        data: {
          quotaUsed: 0,
          quotaResetAt: reset,
        },
      });
    }
  }
}

export function getNextMidnightPT(): Date {
  const now = new Date();
  // Get time in LA
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23'
  });
  
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
  
  const laNow = new Date(Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  ));
  
  // Next midnight in LA time
  const nextLaMidnight = new Date(Date.UTC(
    laNow.getUTCFullYear(),
    laNow.getUTCMonth(),
    laNow.getUTCDate() + 1, // add 1 day
    0, 0, 0
  ));

  // Convert back by finding the diff
  // Los Angeles is generally UTC-8 (or UTC-7 in DST)
  // Or simply, we just use a heuristic if that's easier.
  // Using direct calculation:
  const msUntilMidnight = nextLaMidnight.getTime() - laNow.getTime();
  return new Date(now.getTime() + msUntilMidnight);
}

export async function getActiveKey() {
  await resetExhaustedKeys();

  const keys = await prisma.apiKey.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  });

  for (const key of keys) {
    if (MAX_QUOTA_PER_KEY - key.quotaUsed > QUOTA_SAFE_LIMIT) {
      return key;
    }
  }

  return null; // All keys exhausted
}

export async function increaseQuotaUsage(keyId: string, endpoint: string, cost: number) {
  await prisma.$transaction([
    prisma.apiKey.update({
      where: { id: keyId },
      data: { quotaUsed: { increment: cost } },
    }),
    prisma.quotaLog.create({
      data: {
        apiKeyId: keyId,
        endpoint,
        unitCost: cost,
      },
    }),
  ]);
}
