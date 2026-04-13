import { prisma } from './prisma';

export async function getCachedApiResponse(query: string, filters: any = null): Promise<any | null> {
  const cacheKey = JSON.stringify({ query, filters });
  
  const cacheHit = await prisma.searchCache.findFirst({
    where: {
      query: cacheKey,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (cacheHit) {
    return cacheHit.results;
  }
  
  return null;
}

export async function setCachedApiResponse(query: string, filters: any, results: any) {
  const cacheKey = JSON.stringify({ query, filters });
  
  // Cache for 24 hours
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  await prisma.searchCache.create({
    data: {
      query: cacheKey,
      filters: filters ?? null,
      results: results,
      expiresAt
    }
  });
}
