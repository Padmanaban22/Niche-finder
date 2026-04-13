import { NextResponse } from "next/server";
import { youtubeApi } from "@/lib/youtube-api";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const channelId = params.id;

    // 1. Fetch channel snippet and upload playlist id
    const channelRes = await youtubeApi.channels({
      id: channelId,
      part: 'snippet,statistics,contentDetails'
    });

    if (!channelRes.items || channelRes.items.length === 0) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    const channel = channelRes.items[0];
    const uploadPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadPlaylistId) {
      return NextResponse.json({ error: "No uploads found" }, { status: 404 });
    }

    // 2. Fetch last 50 playlist items
    const playlistRes = await youtubeApi.playlistItems({
      playlistId: uploadPlaylistId,
      part: 'contentDetails',
      maxResults: '50'
    });

    const videoIds = playlistRes.items?.map((i: any) => i.contentDetails.videoId) || [];

    if (videoIds.length === 0) {
      return NextResponse.json({ error: "No videos found" }, { status: 404 });
    }

    // 3. Batch fetch video details
    const videosRes = await youtubeApi.videos({
      id: videoIds.join(','),
      part: 'snippet,statistics,contentDetails'
    });

    const videos = videosRes.items || [];
    let totalViews = 0;

    const parsedVideos = videos.map((v: any) => {
      const views = parseInt(v.statistics?.viewCount || '0', 10);
      totalViews += views;
      return {
        id: v.id,
        title: v.snippet.title,
        views,
        likes: parseInt(v.statistics?.likeCount || '0', 10),
        comments: parseInt(v.statistics?.commentCount || '0', 10),
        publishedAt: v.snippet.publishedAt,
        duration: v.contentDetails?.duration
      };
    });

    const avgViews = totalViews / parsedVideos.length;

    // Enrich videos with outlier status
    const enrichedVideos = parsedVideos.map((v: any) => ({
      ...v,
      isOutlier: v.views > avgViews * 2,
      isUnderperformer: v.views < avgViews * 0.5,
      outlierRatio: Number((v.views / avgViews).toFixed(2))
    }));

    return NextResponse.json({
      channel: {
        id: channel.id,
        name: channel.snippet.title,
        thumbnail: channel.snippet.thumbnails?.default?.url,
        description: channel.snippet.description,
        subs: parseInt(channel.statistics?.subscriberCount || '0', 10),
        totalVideos: parseInt(channel.statistics?.videoCount || '0', 10),
      },
      videos: enrichedVideos,
      stats: {
        avgViews: Math.round(avgViews),
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
