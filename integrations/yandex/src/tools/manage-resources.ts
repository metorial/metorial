import { SlateTool } from 'slates';
import { z } from 'zod';
import * as resourceManager from '../lib/resource-manager';
import { spec } from '../spec';

export let listClouds = SlateTool.create(spec, {
  name: 'List Clouds',
  key: 'list_clouds',
  description: `List all Yandex Cloud organizations accessible by the authenticated account. Returns cloud IDs, names, and metadata.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      clouds: z
        .array(
          z.object({
            cloudId: z.string().describe('Cloud ID'),
            name: z.string().optional().describe('Cloud name'),
            description: z.string().optional().describe('Cloud description'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels')
          })
        )
        .describe('List of clouds'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let result = await resourceManager.listClouds(
      ctx.auth,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let clouds = (result.clouds || []).map((c: any) => ({
      cloudId: c.id,
      name: c.name,
      description: c.description,
      createdAt: c.createdAt,
      labels: c.labels
    }));

    return {
      output: {
        clouds,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${clouds.length} cloud(s).`
    };
  })
  .build();

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description: `List folders within a Yandex Cloud. Folders are used to organize and isolate resources within a cloud.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      cloudId: z.string().optional().describe('Cloud ID to list folders from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z.string().describe('Folder ID'),
            cloudId: z.string().optional().describe('Cloud ID'),
            name: z.string().optional().describe('Folder name'),
            description: z.string().optional().describe('Folder description'),
            status: z.string().optional().describe('Folder status'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels')
          })
        )
        .describe('List of folders'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let cloudId = ctx.input.cloudId || ctx.config.cloudId;
    if (!cloudId) throw new Error('cloudId is required either in input or config');

    let result = await resourceManager.listFolders(
      ctx.auth,
      cloudId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let folders = (result.folders || []).map((f: any) => ({
      folderId: f.id,
      cloudId: f.cloudId,
      name: f.name,
      description: f.description,
      status: f.status,
      createdAt: f.createdAt,
      labels: f.labels
    }));

    return {
      output: {
        folders,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${folders.length} folder(s) in cloud ${cloudId}.`
    };
  })
  .build();

export let manageFolder = SlateTool.create(spec, {
  name: 'Manage Folder',
  key: 'manage_folder',
  description: `Create, update, or delete a folder in Yandex Cloud. Folders organize resources and provide a scope for access control.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      folderId: z.string().optional().describe('Folder ID (required for update and delete)'),
      cloudId: z.string().optional().describe('Cloud ID (required for create)'),
      name: z.string().optional().describe('Folder name (required for create)'),
      description: z.string().optional().describe('Folder description'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      folderId: z.string().optional().describe('Folder ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let cloudId = ctx.input.cloudId || ctx.config.cloudId;
      if (!cloudId) throw new Error('cloudId is required for folder creation');
      if (!ctx.input.name) throw new Error('name is required for folder creation');

      let result = await resourceManager.createFolder(ctx.auth, {
        cloudId,
        name: ctx.input.name,
        description: ctx.input.description,
        labels: ctx.input.labels
      });

      return {
        output: {
          operationId: result.id,
          folderId: result.metadata?.folderId,
          done: result.done || false
        },
        message: `Folder **${ctx.input.name}** creation initiated.`
      };
    } else if (ctx.input.action === 'update') {
      if (!ctx.input.folderId) throw new Error('folderId is required for update');

      let updateFields: string[] = [];
      if (ctx.input.name !== undefined) updateFields.push('name');
      if (ctx.input.description !== undefined) updateFields.push('description');
      if (ctx.input.labels !== undefined) updateFields.push('labels');

      let result = await resourceManager.updateFolder(ctx.auth, ctx.input.folderId, {
        name: ctx.input.name,
        description: ctx.input.description,
        labels: ctx.input.labels,
        updateMask: updateFields.join(',')
      });

      return {
        output: {
          operationId: result.id,
          folderId: ctx.input.folderId,
          done: result.done || false
        },
        message: `Folder **${ctx.input.folderId}** update initiated.`
      };
    } else {
      if (!ctx.input.folderId) throw new Error('folderId is required for deletion');

      let result = await resourceManager.deleteFolder(ctx.auth, ctx.input.folderId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `Folder **${ctx.input.folderId}** deletion initiated.`
      };
    }
  })
  .build();
