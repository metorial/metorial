import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import {
  channelSchema,
  mapChannel,
  mapVideo,
  paginationInputSchema,
  paginationOutputSchema,
  videoSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listChannelsTool = SlateTool.create(spec, {
  name: 'List My Channels',
  key: 'list_channels',
  description: `List all channels the authenticated user has created or follows. Channels group videos by theme.`,
  tags: {
    readOnly: true
  }
})
  .input(paginationInputSchema)
  .output(
    paginationOutputSchema.extend({
      channels: z.array(channelSchema).describe('List of channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.listMyChannels({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let channels = (result.data ?? []).map(mapChannel);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? channels.length,
        channels
      },
      message: `Found **${result.total ?? channels.length}** channels`
    };
  })
  .build();

export let getChannelTool = SlateTool.create(spec, {
  name: 'Get Channel',
  key: 'get_channel',
  description: `Retrieve details about a specific Vimeo channel including its name, description, privacy, and video count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('The ID or URI segment of the channel')
    })
  )
  .output(channelSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let channel = await client.getChannel(ctx.input.channelId);
    let mapped = mapChannel(channel);

    return {
      output: mapped,
      message: `Retrieved channel **${mapped.name}** (${mapped.channelId})`
    };
  })
  .build();

export let createChannelTool = SlateTool.create(spec, {
  name: 'Create Channel',
  key: 'create_channel',
  description: `Create a new Vimeo channel. Channels group videos by theme and can be shared publicly.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the channel'),
      description: z.string().optional().describe('Description of the channel'),
      privacy: z
        .enum(['anybody', 'moderators', 'user'])
        .optional()
        .describe('Who can access the channel'),
      link: z.string().optional().describe('Custom URL slug for the channel')
    })
  )
  .output(channelSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let channel = await client.createChannel({
      name: ctx.input.name,
      description: ctx.input.description,
      privacy: ctx.input.privacy,
      link: ctx.input.link
    });
    let mapped = mapChannel(channel);

    return {
      output: mapped,
      message: `Created channel **${mapped.name}** (${mapped.channelId})`
    };
  })
  .build();

export let deleteChannelTool = SlateTool.create(spec, {
  name: 'Delete Channel',
  key: 'delete_channel',
  description: `Permanently delete a channel. The videos in the channel are not deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('The ID of the channel to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the channel was successfully deleted'),
      channelId: z.string().describe('The ID of the deleted channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    await client.deleteChannel(ctx.input.channelId);

    return {
      output: {
        deleted: true,
        channelId: ctx.input.channelId
      },
      message: `Deleted channel **${ctx.input.channelId}**`
    };
  })
  .build();

export let listChannelVideosTool = SlateTool.create(spec, {
  name: 'List Channel Videos',
  key: 'list_channel_videos',
  description: `List all videos in a specific channel. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      channelId: z.string().describe('The ID of the channel'),
      sort: z
        .enum([
          'added',
          'alphabetical',
          'comments',
          'date',
          'default',
          'duration',
          'likes',
          'manual',
          'modified_time',
          'plays'
        ])
        .optional()
        .describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of videos in the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.getChannelVideos(ctx.input.channelId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let videos = (result.data ?? []).map(mapVideo);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? videos.length,
        videos
      },
      message: `Found **${result.total ?? videos.length}** videos in channel ${ctx.input.channelId}`
    };
  })
  .build();

export let manageChannelVideoTool = SlateTool.create(spec, {
  name: 'Add/Remove Video from Channel',
  key: 'manage_channel_video',
  description: `Add or remove a video from a channel. Use this to curate channel content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('The ID of the channel'),
      videoId: z.string().describe('The ID of the video'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the video')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('The channel ID'),
      videoId: z.string().describe('The video ID'),
      added: z.boolean().describe('Whether the video is now in the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);

    if (ctx.input.action === 'add') {
      await client.addVideoToChannel(ctx.input.channelId, ctx.input.videoId);
    } else {
      await client.removeVideoFromChannel(ctx.input.channelId, ctx.input.videoId);
    }

    return {
      output: {
        channelId: ctx.input.channelId,
        videoId: ctx.input.videoId,
        added: ctx.input.action === 'add'
      },
      message:
        ctx.input.action === 'add'
          ? `Added video **${ctx.input.videoId}** to channel **${ctx.input.channelId}**`
          : `Removed video **${ctx.input.videoId}** from channel **${ctx.input.channelId}**`
    };
  })
  .build();
