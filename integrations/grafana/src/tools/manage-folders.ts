import { SlateTool } from 'slates';
import { z } from 'zod';
import { GrafanaClient } from '../lib/client';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List all folders in the Grafana instance. Folders are used to organize dashboards.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of folders to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      folders: z.array(
        z.object({
          folderUid: z.string().describe('UID of the folder'),
          title: z.string().describe('Folder title'),
          folderUrl: z.string().optional().describe('URL to the folder'),
          parentUid: z.string().optional().describe('UID of the parent folder')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let results = await client.listFolders({
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let folders = results.map((f: any) => ({
      folderUid: f.uid,
      title: f.title,
      folderUrl: f.url,
      parentUid: f.parentUid
    }));

    return {
      output: { folders },
      message: `Found **${folders.length}** folder(s).`
    };
  })
  .build();

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description: `Create a new folder for organizing dashboards. Optionally specify a parent folder UID for nested folders.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Title for the new folder'),
      folderUid: z
        .string()
        .optional()
        .describe('Custom UID for the folder. Auto-generated if not provided.'),
      parentUid: z.string().optional().describe('UID of the parent folder for nesting')
    })
  )
  .output(
    z.object({
      folderUid: z.string().describe('UID of the created folder'),
      title: z.string().describe('Title of the created folder'),
      folderUrl: z.string().optional().describe('URL to the created folder')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.createFolder(
      ctx.input.title,
      ctx.input.folderUid,
      ctx.input.parentUid
    );

    return {
      output: {
        folderUid: result.uid,
        title: result.title,
        folderUrl: result.url
      },
      message: `Folder **${result.title}** created successfully.`
    };
  })
  .build();

export let updateFolder = SlateTool.create(spec, {
  name: 'Update Folder',
  key: 'update_folder',
  description: `Update a folder's title by its UID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      folderUid: z.string().describe('UID of the folder to update'),
      title: z.string().describe('New title for the folder'),
      version: z
        .number()
        .optional()
        .describe('Current version of the folder for optimistic concurrency control')
    })
  )
  .output(
    z.object({
      folderUid: z.string().describe('UID of the updated folder'),
      title: z.string().describe('Updated title'),
      version: z.number().optional().describe('New version number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.updateFolder(
      ctx.input.folderUid,
      ctx.input.title,
      ctx.input.version
    );

    return {
      output: {
        folderUid: result.uid,
        title: result.title,
        version: result.version
      },
      message: `Folder **${result.title}** updated successfully.`
    };
  })
  .build();

export let deleteFolder = SlateTool.create(spec, {
  name: 'Delete Folder',
  key: 'delete_folder',
  description: `Delete a folder and optionally all alert rules within it. Dashboards in the folder will also be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      folderUid: z.string().describe('UID of the folder to delete'),
      forceDeleteRules: z
        .boolean()
        .optional()
        .describe('Set to true to also delete alert rules in the folder')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GrafanaClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteFolder(ctx.input.folderUid, ctx.input.forceDeleteRules);

    return {
      output: {
        message: `Folder ${ctx.input.folderUid} deleted.`
      },
      message: `Folder **${ctx.input.folderUid}** has been deleted.`
    };
  })
  .build();
