import { NextResponse } from "next/server";
import { youtubeApi } from "@/lib/youtube-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchMemory = {
  keywords: string[];
  channels: string[];
  niches: string[];
};

const MEMORY_KEY = "__untapped_shorts_memory__";
const MEMORY_FILTERS = { scope: "global" };
const MEMORY_EXPIRY = new Date("2100-01-01T00:00:00.000Z");

function normalizeLang(value: string): string {
  return (value || "en").toLowerCase().trim().slice(0, 2);
}

function normalizeText(value: string): string {
  return (value || "").trim().toLowerCase();
}

function parseDurationToSeconds(duration: string): number {
  if (!duration) return 0;
  const hours = Number(duration.match(/(\d+)H/)?.[1] || 0);
  const minutes = Number(duration.match(/(\d+)M/)?.[1] || 0);
  const seconds = Number(duration.match(/(\d+)S/)?.[1] || 0);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function buildNicheLabel(query: string, title: string): string {
  const cleaned = `${query} ${title}`
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").filter(Boolean).slice(0, 6);
  return words.join(" ");
}

async function getUploadsPerDay(uploadsPlaylistId: string): Promise<number> {
  const res = await youtubeApi.playlistItems({
    playlistId: uploadsPlaylistId,
    part: "snippet,contentDetails",
    maxResults: "50",
  });
  const items = res.items || [];
  if (items.length <= 1) return items.length;

  const publishTimes = items
    .map((item: any) => {
      const publishedAt = item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt;
      const parsed = new Date(publishedAt);
      return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
    })
    .filter((v: number | null): v is number => v !== null)
    .sort((a, b) => a - b);

  if (publishTimes.length <= 1) return publishTimes.length;

  const rangeDays = Math.max((publishTimes[publishTimes.length - 1] - publishTimes[0]) / (1000 * 60 * 60 * 24), 1);
  return Number((publishTimes.length / rangeDays).toFixed(2));
}

async function getChannelPerformanceSeries(uploadsPlaylistId: string): Promise<Array<{ date: string; views: number; title: string }>> {
  const playlistRes = await youtubeApi.playlistItems({
    playlistId: uploadsPlaylistId,
    part: "snippet,contentDetails",
    maxResults: "12",
  });
  const playlistItems = playlistRes.items || [];
  const ids = Array.from(
    new Set(
      playlistItems
        .map((item: any) => item.contentDetails?.videoId || item.snippet?.resourceId?.videoId)
        .filter(Boolean)
    )
  );
  if (ids.length === 0) return [];

  const videosRes = await youtubeApi.videos({
    id: ids.join(","),
    part: "snippet,statistics",
  });

  return (videosRes.items || [])
    .map((video: any) => ({
      date: video.snippet?.publishedAt || "",
      views: Number(video.statistics?.viewCount || 0),
      title: video.snippet?.title || "Untitled",
    }))
    .filter((item: { date: string; views: number; title: string }) => {
      const parsed = new Date(item.date);
      return !Number.isNaN(parsed.getTime());
    })
    .sort((a: { date: string }, b: { date: string }) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

async function getSearchMemory(): Promise<SearchMemory> {
  const cacheKey = JSON.stringify({ query: MEMORY_KEY, filters: MEMORY_FILTERS });
  const row = await prisma.searchCache.findFirst({
    where: { query: cacheKey },
    orderBy: { cachedAt: "desc" },
  });
  if (!row?.results || typeof row.results !== "object") {
    return { keywords: [], channels: [], niches: [] };
  }
  const raw = row.results as any;
  return {
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
    channels: Array.isArray(raw.channels) ? raw.channels : [],
    niches: Array.isArray(raw.niches) ? raw.niches : [],
  };
}

async function saveSearchMemory(memory: SearchMemory): Promise<void> {
  const cacheKey = JSON.stringify({ query: MEMORY_KEY, filters: MEMORY_FILTERS });
  await prisma.searchCache.create({
    data: {
      query: cacheKey,
      filters: MEMORY_FILTERS,
      results: memory,
      expiresAt: MEMORY_EXPIRY,
    },
  });
}

async function estimateCompetitionLevel(nicheLabel: string, language: string): Promise<number> {
  const res = await youtubeApi.search({
    q: nicheLabel,
    type: "channel",
    part: "snippet",
    maxResults: "50",
    relevanceLanguage: language,
  });
  const uniqueChannels = new Set((res.items || []).map((i: any) => i.snippet?.channelId).filter(Boolean));
  return uniqueChannels.size;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, maxResults = 25 } = body;
    const filters = body.filters || {};
    const requestedLanguage = normalizeLang(body.filters?.language || "en");

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });
    const memory = await getSearchMemory();
    const seenChannels = new Set(memory.channels.map(normalizeText));
    const seenNiches = new Set(memory.niches.map(normalizeText));
    const seenKeywords = new Set(memory.keywords.map(normalizeText));

    const keyword = normalizeText(query);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const userPublishedAfterRaw = filters.publishedAfter ? new Date(filters.publishedAfter) : null;
    const userPublishedBeforeRaw = filters.publishedBefore ? new Date(filters.publishedBefore) : null;
    const userPublishedAfter = userPublishedAfterRaw && !Number.isNaN(userPublishedAfterRaw.getTime())
      ? userPublishedAfterRaw
      : null;
    const userPublishedBefore = userPublishedBeforeRaw && !Number.isNaN(userPublishedBeforeRaw.getTime())
      ? userPublishedBeforeRaw
      : null;
    const minViewsInput = Number(filters.minViews);
    const maxViewsInput = Number(filters.maxViews);
    const minViews = Number.isFinite(minViewsInput) && minViewsInput > 0 ? minViewsInput : 0;
    const maxViews = Number.isFinite(maxViewsInput) && maxViewsInput > 0 ? maxViewsInput : Number.POSITIVE_INFINITY;
    const maxShortsLengthSec = Math.min(180, Math.max(1, Number(filters.maxShortsLengthSec || 180)));
    const maxVideosPerDayInput = Number(filters.maxVideosPerDay);
    const maxVideosPerDay = Number.isFinite(maxVideosPerDayInput) && maxVideosPerDayInput > 0
      ? maxVideosPerDayInput
      : Number.POSITIVE_INFINITY;
    const durationFilter =
      filters.videoDuration === "medium" || filters.videoDuration === "long" || filters.videoDuration === "short"
        ? filters.videoDuration
        : "short";
    const firstVideoUploadedAfter = filters.firstVideoUploadedAfter
      ? new Date(filters.firstVideoUploadedAfter)
      : null;

    const searchRes = await youtubeApi.search({
      q: query,
      type: "video",
      part: "snippet",
      maxResults: String(maxResults),
      order: "viewCount",
      videoDuration: durationFilter,
      ...(userPublishedAfter ? { publishedAfter: userPublishedAfter.toISOString() } : {}),
      ...(userPublishedBefore ? { publishedBefore: userPublishedBefore.toISOString() } : {}),
      relevanceLanguage: requestedLanguage,
    });

    const videoIds = Array.from(
      new Set((searchRes.items || []).map((i: any) => (typeof i.id === "string" ? i.id : i.id?.videoId)).filter(Boolean))
    );
    if (videoIds.length === 0) {
      return NextResponse.json({ data: [], previouslySearched: memory.keywords, cached: false });
    }

    const videosRes = await youtubeApi.videos({
      id: videoIds.join(","),
      part: "snippet,statistics,contentDetails",
    });

    const candidates = (videosRes.items || []).filter((video: any) => {
      const views = Number(video.statistics?.viewCount || 0);
      if (views < minViews || views > maxViews) return false;

      const seconds = parseDurationToSeconds(video.contentDetails?.duration || "PT0S");
      if (durationFilter === "short" && seconds > maxShortsLengthSec) return false;
      if (durationFilter === "medium" && (seconds <= 180 || seconds > 1200)) return false;
      if (durationFilter === "long" && seconds <= 1200) return false;

      const audioLang = normalizeLang(video.snippet?.defaultAudioLanguage || "");
      if (audioLang !== requestedLanguage) return false;

      const titleLang = normalizeLang(video.snippet?.defaultLanguage || requestedLanguage);
      if (titleLang !== requestedLanguage) return false;

      return true;
    });

    if (candidates.length === 0) {
      return NextResponse.json({ data: [], previouslySearched: memory.keywords, cached: false });
    }

    const channelIds = Array.from(new Set(candidates.map((v: any) => v.snippet?.channelId).filter(Boolean)));
    const channelsRes = await youtubeApi.channels({
      id: channelIds.join(","),
      part: "snippet,contentDetails",
    });
    const channelMap = new Map<string, any>();
    (channelsRes.items || []).forEach((channel: any) => channelMap.set(channel.id, channel));

    const preliminaryResults: any[] = [];
    const processedChannelIds = new Set<string>();

    for (const video of candidates) {
      const channelId = video.snippet?.channelId;
      if (!channelId || processedChannelIds.has(channelId)) continue;
      processedChannelIds.add(channelId);
      const channel = channelMap.get(channelId);
      if (!channel) continue;
      if (seenChannels.has(normalizeText(channelId))) continue;

      const firstVideoPublishedAt = new Date(video.snippet?.publishedAt);
      if (Number.isNaN(firstVideoPublishedAt.getTime())) continue;
      if (userPublishedAfter && firstVideoPublishedAt < userPublishedAfter) continue;
      if (userPublishedBefore && firstVideoPublishedAt > userPublishedBefore) continue;
      if (firstVideoPublishedAt > now) continue;
      if (
        firstVideoUploadedAfter &&
        !Number.isNaN(firstVideoUploadedAfter.getTime()) &&
        firstVideoPublishedAt < firstVideoUploadedAfter
      ) {
        continue;
      }

      const channelCreatedAt = new Date(channel.snippet?.publishedAt);
      const channelCreationIso = Number.isNaN(channelCreatedAt.getTime())
        ? ""
        : channelCreatedAt.toISOString();

      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) continue;

      const nicheLabel = buildNicheLabel(query, video.snippet?.title || "");
      if (!nicheLabel || seenNiches.has(normalizeText(nicheLabel))) continue;

      let uploadsPerDay: number | undefined = undefined;
      if (Number.isFinite(maxVideosPerDay)) {
        uploadsPerDay = await getUploadsPerDay(uploadsPlaylistId);
        if (uploadsPerDay > maxVideosPerDay) continue;
      }

      preliminaryResults.push({
        channelId,
        channelName: channel.snippet?.title || video.snippet?.channelTitle || "Unknown channel",
        channelUrl: `https://www.youtube.com/channel/${channelId}`,
        channelCreationDate: channelCreationIso,
        firstVideoTitle: video.snippet?.title || "Untitled",
        firstVideoUrl: `https://www.youtube.com/watch?v=${video.id}`,
        firstVideoViews: Number(video.statistics?.viewCount || 0),
        firstVideoUploadDate: firstVideoPublishedAt.toISOString(),
        nicheLabel,
        detectedLanguage: requestedLanguage,
        competitionLevel: 0,
        uploadsPerDay,
        performanceSeries: [],
        untappedReason: "Uploaded in the selected window and crossed the configured views threshold.",
      });
    }

    const nicheCounts = new Map<string, number>();
    for (const row of preliminaryResults) {
      const key = normalizeText(row.nicheLabel);
      nicheCounts.set(key, (nicheCounts.get(key) || 0) + 1);
    }

    const results = preliminaryResults.filter((row) => {
      const competition = nicheCounts.get(normalizeText(row.nicheLabel)) || 0;
      row.competitionLevel = competition;
      row.untappedReason = `Uploaded in the selected window, crossed the views threshold, and only ${competition} similar channels found in this result set.`;
      return competition < 20;
    });

    results.sort((a, b) => b.firstVideoViews - a.firstVideoViews);

    const performanceTargets = results.slice(0, 6);
    await Promise.all(
      performanceTargets.map(async (row) => {
        const channel = channelMap.get(row.channelId);
        const uploadsPlaylistId = channel?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsPlaylistId) return;
        row.performanceSeries = await getChannelPerformanceSeries(uploadsPlaylistId);
      })
    );

    const nextMemory: SearchMemory = {
      keywords: Array.from(new Set([...memory.keywords, keyword])).slice(-200),
      channels: Array.from(new Set([...memory.channels, ...results.map((r) => normalizeText(r.channelUrl.split("/").pop() || ""))])).slice(-5000),
      niches: Array.from(new Set([...memory.niches, ...results.map((r) => normalizeText(r.nicheLabel))])).slice(-5000),
    };
    if (!seenKeywords.has(keyword) || results.length > 0) {
      await saveSearchMemory(nextMemory);
    }

    return NextResponse.json({
      data: results,
      previouslySearched: nextMemory.keywords,
      cached: false,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const memory = await getSearchMemory();
    return NextResponse.json({ previouslySearched: memory.keywords });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
