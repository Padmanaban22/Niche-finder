import { NextResponse } from "next/server";
import { youtubeApi } from "@/lib/youtube-api";
import { getCachedApiResponse, setCachedApiResponse } from "@/lib/cache";
import { detectFacelessChannel } from "@/lib/faceless-detector";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, maxResults = 20 } = body;

    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    // Try cache
    const cached = await getCachedApiResponse(query, body.filters || {});
    if (cached) {
      return NextResponse.json({ data: cached, cached: true });
    }

    // 1. Search for videos to find relevant channels
    const searchRes = await youtubeApi.search({
      q: query,
      type: 'video',
      part: 'snippet',
      maxResults: maxResults.toString(),
      order: 'relevance',
      ...(body.filters?.publishedAfter && { publishedAfter: body.filters.publishedAfter }),
      ...(body.filters?.publishedBefore && { publishedBefore: body.filters.publishedBefore }),
      ...(body.filters?.videoDuration && body.filters.videoDuration !== 'any' && { videoDuration: body.filters.videoDuration }),
      ...(body.filters?.language && body.filters.language !== 'any' && { relevanceLanguage: body.filters.language })
    });

    const videoIds = Array.from(new Set(searchRes.items.map((i: any) => typeof i.id === "string" ? i.id : i.id.videoId).filter(Boolean)));
    
    if (videoIds.length === 0) {
      return NextResponse.json({ data: [], cached: false });
    }

    // 2. Fetch video details
    const videosRes = await youtubeApi.videos({
      id: videoIds.join(','),
      part: 'snippet,statistics,contentDetails'
    });

    const minViews = body.filters?.minViews ? Number(body.filters.minViews) : 0;
    const maxViews = body.filters?.maxViews ? Number(body.filters.maxViews) : Infinity;
    const targetLang = body.filters?.language && body.filters.language !== 'any' ? body.filters.language : null;

    // Filter videos by exact view count and hard language enforcement
    const filteredVideos = (videosRes.items || []).filter((v: any) => {
      const views = parseInt(v.statistics?.viewCount || '0', 10);
      if (views < minViews || views > maxViews) return false;

      if (targetLang) {
        const defLang = v.snippet?.defaultLanguage?.substring(0, 2);
        const audLang = v.snippet?.defaultAudioLanguage?.substring(0, 2);
        
        // If explicitly tagged as a WRONG language, reject it immediately
        if (defLang && defLang !== targetLang) return false;
        if (audLang && audLang !== targetLang) return false;

        // Fallback: If they requested English but YouTube returns Hindi (often untagged), reject Devanagari script text
        if (targetLang === 'en') {
          const hasHindiOrCyrillic = /[\u0900-\u097F\u0400-\u04FF]/.test(v.snippet.title);
          if (hasHindiOrCyrillic) return false;
        }
      }

      return true;
    });

    if (filteredVideos.length === 0) {
      return NextResponse.json({ data: [], cached: false });
    }

    const channelIds = Array.from(new Set(filteredVideos.map((v: any) => v.snippet.channelId)));
    
    // 3. Fetch channel details for the surviving videos
    const channelsRes = await youtubeApi.channels({
      id: channelIds.join(','),
      part: 'snippet,statistics'
    });

    const channelMap = new Map();
    (channelsRes.items || []).forEach((c: any) => channelMap.set(c.id, c));

    const enrichedData = [];

    // 4. Assemble the exact video data
    for (const v of filteredVideos) {
      try {
        const views = parseInt(v.statistics?.viewCount || '0', 10);
        const dur = v.contentDetails?.duration || 'PT0S';
        let mins = parseInt(dur.match(/(\d+)M/)?.[1] || '0', 10);
        if (dur.includes('H')) mins += parseInt(dur.match(/(\d+)H/)?.[1] || '0', 10) * 60;

        const channel = channelMap.get(v.snippet.channelId);
        const subs = channel ? parseInt(channel.statistics?.subscriberCount || '0', 10) : 0;
        const viewsSubRatio = subs > 0 ? Number((views / subs).toFixed(4)) : 0;
        
        // Detect faceless
        const facelessData = detectFacelessChannel(
          channel?.snippet?.description || '',
          [v.snippet.title],
          "Unknown", 
          mins,
          0 // disabled uploads metric for individual view search
        );

        enrichedData.push({
          id: v.id,
          title: v.snippet.title,
          thumbnail: v.snippet.thumbnails?.medium?.url || v.snippet.thumbnails?.default?.url,
          views,
          publishedAt: v.snippet.publishedAt,
          durationMin: mins,
          channelId: v.snippet.channelId,
          channelName: v.snippet.channelTitle,
          channelSubs: subs,
          viewsSubRatio,
          facelessScore: facelessData.score,
          facelessLevel: facelessData.level,
        });
      } catch (err) {
        console.error("Failed parsing video: " + v.id);
      }
    }

    // Sort by views desc
    enrichedData.sort((a, b) => b.views - a.views);

    await setCachedApiResponse(query, body.filters || {}, enrichedData);

    return NextResponse.json({ data: enrichedData, cached: false });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
