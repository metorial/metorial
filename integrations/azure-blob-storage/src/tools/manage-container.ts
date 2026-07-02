import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContainer = SlateTool.create(spec, {
  name: 'Manage Container',
  key: 'manage_container',
  description: `Create or delete a container in Azure Blob Storage. When creating, you can optionally set public access level and initial metadata. When deleting, the container and all its blobs are permanently removed.`,
  instructions: [
    'Container names must be 3-63 characters, lowercase letters, numbers, and hyphens only.',
    'Public access must be explicitly set if you want blobs or the container to be publicly readable.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container to create or delete'),
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      publicAccess: z
        .enum(['container', 'blob'])
        .optional()
        .describe('Public access level when creating (omit for private)'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value metadata to set on the container when creating')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Name of the container'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'create') {
      await client.createContainer(
        ctx.input.containerName,
        ctx.input.publicAccess,
        ctx.input.metadata
      );
    } else {
      await client.deleteContainer(ctx.input.containerName);
    }

    return {
      output: {
        containerName: ctx.input.containerName,
        action: ctx.input.action,
        success: true
      },
      message: `Container **${ctx.input.containerName}** has been ${ctx.input.action === 'create' ? 'created' : 'deleted'} successfully.`
    };
  })
  .build();
