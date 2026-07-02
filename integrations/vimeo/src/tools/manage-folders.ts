import { SlateTool } from 'slates';
import { z } from 'zod';
import { VimeoClient } from '../lib/client';
import {
  folderSchema,
  mapFolder,
  mapVideo,
  paginationInputSchema,
  paginationOutputSchema,
  videoSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listFoldersTool = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List all folders for the authenticated user. Folders are used for internal video organization.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      sort: z
        .enum(['alphabetical', 'date', 'modified_time', 'last_user_action_event_date'])
        .optional()
        .describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      folders: z.array(folderSchema).describe('List of folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.listFolders({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort
    });

    let folders = (result.data ?? []).map(mapFolder);

    return {
      output: {
        total: result.total ?? 0,
        page: result.page ?? 1,
        perPage: result.perPage ?? folders.length,
        folders
      },
      message: `Found **${result.total ?? folders.length}** folders`
    };
  })
  .build();

export let createFolderTool = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder for organizing videos. Folders can optionally be nested inside a parent folder.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the folder'),
      parentFolderUri: z
        .string()
        .optional()
        .describe(
          'URI of the parent folder for nesting (e.g. /users/{user_id}/projects/{project_id})'
        )
    })
  )
  .output(folderSchema)
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let folder = await client.createFolder(ctx.input.name, ctx.input.parentFolderUri);
    let mapped = mapFolder(folder);

    return {
      output: mapped,
      message: `Created folder **${mapped.name}** (${mapped.folderId})`
    };
  })
  .build();

export let deleteFolderTool = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Permanently delete a folder. Videos in the folder are not deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      folderId: z.string().describe('The ID of the folder to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the folder was successfully deleted'),
      folderId: z.string().describe('The ID of the deleted folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    await client.deleteFolder(ctx.input.folderId);

    return {
      output: {
        deleted: true,
        folderId: ctx.input.folderId
      },
      message: `Deleted folder **${ctx.input.folderId}**`
    };
  })
  .build();

export let listFolderVideosTool = SlateTool.create(spec, {
  name: 'List Folder Videos',
  key: 'list_folder_videos',
  description: `List all videos in a specific folder. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    paginationInputSchema.extend({
      folderId: z.string().describe('The ID of the folder'),
      sort: z
        .enum(['alphabetical', 'date', 'default', 'duration', 'modified_time', 'plays'])
        .optional()
        .describe('Sort order for the results')
    })
  )
  .output(
    paginationOutputSchema.extend({
      videos: z.array(videoSchema).describe('List of videos in the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let result = await client.getFolderVideos(ctx.input.folderId, {
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
      message: `Found **${result.total ?? videos.length}** videos in folder ${ctx.input.folderId}`
    };
  })
  .build();

export let manageFolderVideoTool = SlateTool.create(spec, {
  name: 'Add/Remove Video from Folder',
  key: 'manage_folder_video',
  description: `Add or remove a video from a folder. Use this to organize videos into folders.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderId: z.string().describe('The ID of the folder'),
      videoId: z.string().describe('The ID of the video'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the video')
    })
  )
  .output(
    z.object({
      folderId: z.string().describe('The folder ID'),
      videoId: z.string().describe('The video ID'),
      added: z.boolean().describe('Whether the video is now in the folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VimeoClient(ctx.auth.token);
    let videoUri = `/videos/${ctx.input.videoId}`;

    if (ctx.input.action === 'add') {
      await client.addVideoToFolder(ctx.input.folderId, videoUri);
    } else {
      await client.removeVideoFromFolder(ctx.input.folderId, videoUri);
    }

    return {
      output: {
        folderId: ctx.input.folderId,
        videoId: ctx.input.videoId,
        added: ctx.input.action === 'add'
      },
      message:
        ctx.input.action === 'add'
          ? `Added video **${ctx.input.videoId}** to folder **${ctx.input.folderId}**`
          : `Removed video **${ctx.input.videoId}** from folder **${ctx.input.folderId}**`
    };
  })
  .build();
