import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import {
  mapShowcase,
  mapVideo,
  paginationInputSchema,
  paginationOutputSchema,
  showcaseSchema,
  videoSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listShowcasesTool = SlateTool.create(spec, {
  name: 'List Showcases',
  key: 'list_showcases',
  description: `List all showcases (curated video collections) for the authenticated user. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      sort: z
        .enum(['alphabetical', 'date', 'modified_time', 'videos'])
        .optional()
        .describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      showcases: z.array(showcaseSchema).describe('List of showcases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.listShowcases({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let showcases = (result.data ?? []).map(mapShowcase);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? showcases.length,
        showcases
      },
      message: `Found **${result.total ?? showcases.length}** showcases`
    };
  })
  .build();

export let createShowcaseTool = SlateTool.create(spec, {
  name: 'Create Showcase',
  key: 'create_showcase',
  description: `Create a new showcase (curated video collection). Showcases can be public or private and optionally password-protected.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the showcase'),
      description: z.string().optional().describe('Description of the showcase'),
      privacy: z
        .enum(['anybody', 'embed_only', 'nobody', 'password', 'team'])
        .optional()
        .describe('Privacy setting for the showcase'),
      password: z
        .string()
        .optional()
        .describe('Password for the showcase (required if privacy is "password")'),
      sort: z
        .enum([
          'added_first',
          'added_last',
          'alphabetical',
          'arranged',
          'comments',
          'likes',
          'newest',
          'oldest',
          'plays'
        ])
        .optional()
        .describe('Default sort order for videos in the showcase'),
      brandColor: z.string().optional().describe('Brand color hex code for the showcase')
    })
  )
  .output(showcaseSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let showcase = await client.createShowcase({
      name: ctx.input.name,
      description: ctx.input.description,
      privacy: ctx.input.privacy,
      password: ctx.input.password,
      sort: ctx.input.sort,
      brandColor: ctx.input.brandColor
    });
    let mapped = mapShowcase(showcase);

    return {
      output: mapped,
      message: `Created showcase **${mapped.name}** (${mapped.showcaseId})`
    };
  })
  .build();

export let editShowcaseTool = SlateTool.create(spec, {
  name: 'Edit Showcase',
  key: 'edit_showcase',
  description: `Update the name, description, privacy, or other settings of an existing showcase. Only the fields you provide will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      showcaseId: z.string().describe('The ID of the showcase to edit'),
      name: z.string().optional().describe('New name for the showcase'),
      description: z.string().optional().describe('New description for the showcase'),
      privacy: z
        .enum(['anybody', 'embed_only', 'nobody', 'password', 'team'])
        .optional()
        .describe('Privacy setting for the showcase'),
      password: z.string().optional().describe('Password for the showcase'),
      sort: z
        .enum([
          'added_first',
          'added_last',
          'alphabetical',
          'arranged',
          'comments',
          'likes',
          'newest',
          'oldest',
          'plays'
        ])
        .optional()
        .describe('Default sort order for videos'),
      brandColor: z.string().optional().describe('Brand color hex code for the showcase')
    })
  )
  .output(showcaseSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let showcase = await client.editShowcase(ctx.input.showcaseId, {
      name: ctx.input.name,
      description: ctx.input.description,
      privacy: ctx.input.privacy,
      password: ctx.input.password,
      sort: ctx.input.sort,
      brandColor: ctx.input.brandColor
    });
    let mapped = mapShowcase(showcase);

    return {
      output: mapped,
      message: `Updated showcase **${mapped.name}** (${mapped.showcaseId})`
    };
  })
  .build();

export let deleteShowcaseTool = SlateTool.create(spec, {
  name: 'Delete Showcase',
  key: 'delete_showcase',
  description: `Permanently delete a showcase. The videos in the showcase are not deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      showcaseId: z.string().describe('The ID of the showcase to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the showcase was successfully deleted'),
      showcaseId: z.string().describe('The ID of the deleted showcase')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    await client.deleteShowcase(ctx.input.showcaseId);

    return {
      output: {
        deleted: true,
        showcaseId: ctx.input.showcaseId
      },
      message: `Deleted showcase **${ctx.input.showcaseId}**`
    };
  })
  .build();

export let getShowcaseVideosTool = SlateTool.create(spec, {
  name: 'List Showcase Videos',
  key: 'list_showcase_videos',
  description: `List all videos in a specific showcase. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      showcaseId: z.string().describe('The ID of the showcase'),
      sort: z
        .enum([
          'alphabetical',
          'comments',
          'date',
          'default',
          'duration',
          'likes',
          'modified_time',
          'plays'
        ])
        .optional()
        .describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of videos in the showcase')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.getShowcaseVideos(ctx.input.showcaseId, {
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
      message: `Found **${result.total ?? videos.length}** videos in showcase ${ctx.input.showcaseId}`
    };
  })
  .build();

export let manageShowcaseVideoTool = SlateTool.create(spec, {
  name: 'Add/Remove Video from Showcase',
  key: 'manage_showcase_video',
  description: `Add or remove a video from a showcase. Use this to curate the video collection in a showcase.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      showcaseId: z.string().describe('The ID of the showcase'),
      videoId: z.string().describe('The ID of the video'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the video')
    })
  )
  .output(
    z.object({
      showcaseId: z.string().describe('The showcase ID'),
      videoId: z.string().describe('The video ID'),
      added: z.boolean().describe('Whether the video is now in the showcase')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);

    if (ctx.input.action === 'add') {
      await client.addVideoToShowcase(ctx.input.showcaseId, ctx.input.videoId);
    } else {
      await client.removeVideoFromShowcase(ctx.input.showcaseId, ctx.input.videoId);
    }

    return {
      output: {
        showcaseId: ctx.input.showcaseId,
        videoId: ctx.input.videoId,
        added: ctx.input.action === 'add'
      },
      message:
        ctx.input.action === 'add'
          ? `Added video **${ctx.input.videoId}** to showcase **${ctx.input.showcaseId}**`
          : `Removed video **${ctx.input.videoId}** from showcase **${ctx.input.showcaseId}**`
    };
  })
  .build();
