import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamClient } from '../lib/client';
import { spec } from '../spec';

let videoSchema = z
  .object({
    videoId: z.string().describe('Unique GUID of the video'),
    videoLibraryId: z.number().optional().describe('Video library ID'),
    title: z.string().optional().describe('Video title'),
    dateUploaded: z.string().optional().describe('Upload date'),
    status: z
      .number()
      .optional()
      .describe(
        'Processing status code (0=Queued, 1=Processing, 2=Encoding, 3=Finished, 4=ResolutionFinished, 5=Failed)'
      ),
    encodeProgress: z.number().optional().describe('Encoding progress percentage'),
    storageSize: z.number().optional().describe('Storage size in bytes'),
    length: z.number().optional().describe('Video duration in seconds'),
    width: z.number().optional().describe('Video width in pixels'),
    height: z.number().optional().describe('Video height in pixels'),
    framerate: z.number().optional().describe('Video framerate'),
    availableResolutions: z
      .string()
      .optional()
      .describe('Comma-separated available resolutions'),
    thumbnailCount: z.number().optional().describe('Number of generated thumbnails'),
    collectionId: z.string().optional().describe('Collection ID'),
    views: z.number().optional().describe('Total view count'),
    averageWatchTime: z.number().optional().describe('Average watch time in seconds'),
    totalWatchTime: z.number().optional().describe('Total watch time in seconds'),
    hasMP4Fallback: z.boolean().optional().describe('Whether MP4 fallback is available'),
    captions: z
      .array(
        z.object({
          srclang: z.string().optional(),
          label: z.string().optional()
        })
      )
      .optional()
      .describe('Available captions')
  })
  .passthrough();

export let manageVideo = SlateTool.create(spec, {
  name: 'Manage Video',
  key: 'manage_video',
  description: `List, retrieve, create, update, or delete videos in a Bunny Stream library. Also supports fetching a video from a URL and re-encoding. Requires the Stream Library API Key.`,
  instructions: [
    "To upload a video: first create it (returns a GUID), then use the provider's upload mechanism with that GUID.",
    'Use "fetch" action to import a video directly from a URL without downloading it locally.',
    'Use "reencode" to trigger re-encoding of an existing video.'
  ],
  constraints: [
    'Requires the Stream Library API Key to be configured.',
    'Direct binary upload is not supported through this tool. Use "fetch" to import from URL, or use the Bunny dashboard for file uploads.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete', 'fetch', 'reencode'])
        .describe('The operation to perform'),
      libraryId: z.number().describe('Video library ID'),
      videoId: z
        .string()
        .optional()
        .describe('Video GUID. Required for get, update, delete, and reencode.'),
      title: z.string().optional().describe('Video title (create/update)'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID to organize the video (create/update)'),
      thumbnailTime: z
        .number()
        .optional()
        .describe('Timestamp in seconds for thumbnail generation (create)'),
      fetchUrl: z.string().optional().describe('URL to fetch the video from (fetch action)'),
      fetchHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom headers for fetching the video (fetch action)'),
      chapters: z
        .array(
          z.object({
            title: z.string(),
            start: z.number(),
            end: z.number()
          })
        )
        .optional()
        .describe('Video chapters (update)'),
      moments: z
        .array(
          z.object({
            label: z.string(),
            timestamp: z.number()
          })
        )
        .optional()
        .describe('Video moments/markers (update)'),
      metaTags: z
        .array(
          z.object({
            property: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Video meta tags (update)'),
      search: z.string().optional().describe('Search term (list action)'),
      page: z.number().optional().describe('Page number (list action)'),
      itemsPerPage: z.number().optional().describe('Items per page (list action)'),
      orderBy: z
        .string()
        .optional()
        .describe('Order by field: date, title, etc. (list action)')
    })
  )
  .output(
    z.object({
      video: videoSchema.optional().describe('Video details'),
      videos: z.array(videoSchema).optional().describe('List of videos'),
      totalItems: z.number().optional().describe('Total number of videos'),
      currentPage: z.number().optional().describe('Current page number'),
      deleted: z.boolean().optional().describe('Whether the video was deleted'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.streamToken) {
      throw new Error(
        'Stream Library API Key is required for video operations. Please configure it in the authentication settings.'
      );
    }

    let client = new StreamClient({ streamToken: ctx.auth.streamToken });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listVideos(ctx.input.libraryId, {
          page: ctx.input.page,
          itemsPerPage: ctx.input.itemsPerPage,
          search: ctx.input.search,
          collection: ctx.input.collectionId,
          orderBy: ctx.input.orderBy
        });
        return {
          output: {
            videos: result.items || [],
            totalItems: result.totalItems,
            currentPage: result.currentPage
          },
          message: `Found **${result.totalItems}** videos in library ${ctx.input.libraryId}.`
        };
      }
      case 'get': {
        let video = await client.getVideo(ctx.input.libraryId, ctx.input.videoId!);
        return {
          output: { video },
          message: `Retrieved video **${video.title}** (${video.guid}, status: ${video.status}).`
        };
      }
      case 'create': {
        let data: any = { title: ctx.input.title! };
        if (ctx.input.collectionId) data.collectionId = ctx.input.collectionId;
        if (ctx.input.thumbnailTime !== undefined)
          data.thumbnailTime = ctx.input.thumbnailTime;

        let video = await client.createVideo(ctx.input.libraryId, data);
        return {
          output: { video },
          message: `Created video **${video.title}** (GUID: ${video.guid}). Upload content to complete.`
        };
      }
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.title !== undefined) data.title = ctx.input.title;
        if (ctx.input.collectionId !== undefined) data.collectionId = ctx.input.collectionId;
        if (ctx.input.chapters) data.chapters = ctx.input.chapters;
        if (ctx.input.moments) data.moments = ctx.input.moments;
        if (ctx.input.metaTags) data.metaTags = ctx.input.metaTags;

        await client.updateVideo(ctx.input.libraryId, ctx.input.videoId!, data);
        return {
          output: { success: true },
          message: `Updated video **${ctx.input.videoId}**.`
        };
      }
      case 'delete': {
        await client.deleteVideo(ctx.input.libraryId, ctx.input.videoId!);
        return {
          output: { deleted: true },
          message: `Deleted video **${ctx.input.videoId}**.`
        };
      }
      case 'fetch': {
        let data: any = { url: ctx.input.fetchUrl! };
        if (ctx.input.fetchHeaders) data.headers = ctx.input.fetchHeaders;

        let result = await client.fetchVideo(ctx.input.libraryId, data);
        return {
          output: { success: true, video: result },
          message: `Started fetching video from **${ctx.input.fetchUrl}**. The video will be processed asynchronously.`
        };
      }
      case 'reencode': {
        await client.reencodeVideo(ctx.input.libraryId, ctx.input.videoId!);
        return {
          output: { success: true },
          message: `Triggered re-encode for video **${ctx.input.videoId}**.`
        };
      }
    }
  })
  .build();
