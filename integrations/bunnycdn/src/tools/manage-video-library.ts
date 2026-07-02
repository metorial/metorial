import { SlateTool } from 'slates';
import { z } from 'zod';
import { CoreClient } from '../lib/client';
import { spec } from '../spec';

let videoLibrarySchema = z
  .object({
    videoLibraryId: z.number().describe('Unique ID of the video library'),
    name: z.string().describe('Name of the video library'),
    videoCount: z.number().optional().describe('Number of videos in the library'),
    trafficUsage: z.number().optional().describe('Traffic usage in bytes'),
    storageUsage: z.number().optional().describe('Storage usage in bytes'),
    dateCreated: z.string().optional().describe('Creation date'),
    apiKey: z
      .string()
      .optional()
      .describe('Library API key (only if includeAccessKey is true)'),
    readOnlyApiKey: z.string().optional().describe('Read-only API key'),
    pullZoneId: z.number().optional().describe('Linked pull zone ID'),
    webhookUrl: z.string().optional().describe('Configured webhook URL'),
    playerKeyColor: z.string().optional().describe('Player accent color'),
    enableTokenAuthentication: z
      .boolean()
      .optional()
      .describe('Whether token auth is enabled'),
    enableDrm: z.boolean().optional().describe('Whether DRM is enabled'),
    enableMp4Fallback: z.boolean().optional().describe('Whether MP4 fallback is enabled'),
    keepOriginalFiles: z.boolean().optional().describe('Whether original files are kept'),
    enabledResolutions: z
      .string()
      .optional()
      .describe('Comma-separated list of enabled resolutions')
  })
  .passthrough();

export let manageVideoLibrary = SlateTool.create(spec, {
  name: 'Manage Video Library',
  key: 'manage_video_library',
  description: `Create, list, retrieve, update, or delete Bunny Stream video libraries. Video libraries are containers for your video content with their own encoding, player, and security settings. Each library has its own API key for video management operations.`,
  instructions: [
    'Use "list" to see all libraries. Set includeAccessKey to true if you need the API keys.',
    'Use "create" with a name to set up a new video library.',
    'Use "update" to change library settings like webhook URL, encoding, DRM, or player customization.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The operation to perform'),
      videoLibraryId: z
        .number()
        .optional()
        .describe('Video library ID. Required for get, update, and delete.'),
      includeAccessKey: z
        .boolean()
        .optional()
        .describe('Include the library API key in the response (list/get)'),
      name: z.string().optional().describe('Library name (create/update)'),
      replicationRegions: z
        .array(z.string())
        .optional()
        .describe('Replication region codes (create)'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL for video processing notifications (update)'),
      enableTokenAuthentication: z
        .boolean()
        .optional()
        .describe('Enable token authentication (update)'),
      enableDrm: z.boolean().optional().describe('Enable DRM protection (update)'),
      enableMp4Fallback: z.boolean().optional().describe('Enable MP4 fallback (update)'),
      keepOriginalFiles: z
        .boolean()
        .optional()
        .describe('Keep original uploaded files (update)'),
      enabledResolutions: z
        .string()
        .optional()
        .describe(
          'Comma-separated enabled resolutions, e.g. "240p,360p,480p,720p,1080p" (update)'
        ),
      playerKeyColor: z.string().optional().describe('Player accent color hex (update)'),
      vastTagUrl: z.string().optional().describe('VAST ad tag URL (update)'),
      page: z.number().optional().describe('Page number (list action)'),
      perPage: z.number().optional().describe('Results per page (list action)'),
      search: z.string().optional().describe('Search term (list action)')
    })
  )
  .output(
    z.object({
      videoLibrary: videoLibrarySchema.optional().describe('Video library details'),
      videoLibraries: z
        .array(videoLibrarySchema)
        .optional()
        .describe('List of video libraries'),
      totalItems: z.number().optional().describe('Total number of libraries'),
      currentPage: z.number().optional().describe('Current page number'),
      deleted: z.boolean().optional().describe('Whether the library was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CoreClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listVideoLibraries({
          page: ctx.input.page,
          perPage: ctx.input.perPage,
          search: ctx.input.search,
          includeAccessKey: ctx.input.includeAccessKey
        });
        return {
          output: {
            videoLibraries: result.Items || [],
            totalItems: result.TotalItems,
            currentPage: result.CurrentPage
          },
          message: `Found **${result.TotalItems}** video libraries.`
        };
      }
      case 'get': {
        let lib = await client.getVideoLibrary(
          ctx.input.videoLibraryId!,
          ctx.input.includeAccessKey
        );
        return {
          output: { videoLibrary: lib },
          message: `Retrieved video library **${lib.Name}** (ID: ${lib.Id}, ${lib.VideoCount} videos).`
        };
      }
      case 'create': {
        let data: any = { Name: ctx.input.name! };
        if (ctx.input.replicationRegions)
          data.ReplicationRegions = ctx.input.replicationRegions;

        let lib = await client.createVideoLibrary(data);
        return {
          output: { videoLibrary: lib },
          message: `Created video library **${lib.Name}** (ID: ${lib.Id}).`
        };
      }
      case 'update': {
        let data: Record<string, any> = {};
        if (ctx.input.name !== undefined) data.Name = ctx.input.name;
        if (ctx.input.webhookUrl !== undefined) data.WebhookUrl = ctx.input.webhookUrl;
        if (ctx.input.enableTokenAuthentication !== undefined)
          data.EnableTokenAuthentication = ctx.input.enableTokenAuthentication;
        if (ctx.input.enableDrm !== undefined) data.EnableDRM = ctx.input.enableDrm;
        if (ctx.input.enableMp4Fallback !== undefined)
          data.EnableMP4Fallback = ctx.input.enableMp4Fallback;
        if (ctx.input.keepOriginalFiles !== undefined)
          data.KeepOriginalFiles = ctx.input.keepOriginalFiles;
        if (ctx.input.enabledResolutions !== undefined)
          data.EnabledResolutions = ctx.input.enabledResolutions;
        if (ctx.input.playerKeyColor !== undefined)
          data.PlayerKeyColor = ctx.input.playerKeyColor;
        if (ctx.input.vastTagUrl !== undefined) data.VastTagUrl = ctx.input.vastTagUrl;

        let lib = await client.updateVideoLibrary(ctx.input.videoLibraryId!, data);
        return {
          output: { videoLibrary: lib },
          message: `Updated video library **${ctx.input.videoLibraryId}**.`
        };
      }
      case 'delete': {
        await client.deleteVideoLibrary(ctx.input.videoLibraryId!);
        return {
          output: { deleted: true },
          message: `Deleted video library **${ctx.input.videoLibraryId}**.`
        };
      }
    }
  })
  .build();
