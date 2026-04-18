import { getActiveKey, increaseQuotaUsage, QUOTA_COSTS } from './quota-tracker';
import { decrypt } from './encryption';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export class YouTubeApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

async function fetchWithRotation(endpoint: string, params: Record<string, string>, cost: number): Promise<any> {
  const activeKeyData = await getActiveKey();
  if (!activeKeyData) {
    throw new YouTubeApiError('All API keys exhausted. Quota resets at midnight PT. Add more keys in Settings.', 403);
  }

  let apiKey = '';
  try {
    apiKey = decrypt(activeKeyData.encryptedKey);
  } catch (err) {
    // Key is corrupted (e.g. wrong encryption secret). Disable it to prevent infinite loops and retry next key.
    const { prisma } = await import('./prisma');
    await prisma.apiKey.update({
      where: { id: activeKeyData.id },
      data: { isActive: false }
    });
    return fetchWithRotation(endpoint, params, cost);
  }

  const searchParams = new URLSearchParams({ ...params, key: apiKey });
  const url = `${BASE_URL}${endpoint}?${searchParams.toString()}`;

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    const reasons = ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'];
    const isQuotaError = response.status === 403 && 
      (data.error?.errors?.some((e: any) => reasons.includes(e.reason)) || 
       data.error?.message?.toLowerCase().includes("quota"));

    if (isQuotaError) {
      // Mark key as exhausted and retry with next key
      const { prisma } = await import('./prisma');
      await prisma.apiKey.update({
        where: { id: activeKeyData.id },
        data: { quotaUsed: 10000 }, // Max it out to force rotation
      });
      return fetchWithRotation(endpoint, params, cost);
    }
    throw new YouTubeApiError(data.error?.message || 'Unknown YouTube API Error', response.status);
  }

  // Log quota
  await increaseQuotaUsage(activeKeyData.id, endpoint, cost);

  return data;
}

export const youtubeApi = {
  search: (params: Record<string, string>) => fetchWithRotation('/search', params, QUOTA_COSTS.SEARCH),
  videos: (params: Record<string, string>) => fetchWithRotation('/videos', params, QUOTA_COSTS.VIDEOS),
  channels: (params: Record<string, string>) => fetchWithRotation('/channels', params, QUOTA_COSTS.CHANNELS),
  playlistItems: (params: Record<string, string>) => fetchWithRotation('/playlistItems', params, QUOTA_COSTS.PLAYLIST_ITEMS),
};
