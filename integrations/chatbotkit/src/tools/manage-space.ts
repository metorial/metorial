import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSpaceTool = SlateTool.create(spec, {
  name: 'Manage Space',
  key: 'manage_space',
  description: `Create, update, delete, or fetch spaces. Spaces are collaborative environments for organizing conversations, contacts, and shared resources in isolated workspaces.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete', 'fetch']).describe('Action to perform'),
      spaceId: z.string().optional().describe('Space ID (required for update, delete, fetch)'),
      name: z.string().optional().describe('Space name'),
      description: z.string().optional().describe('Space description'),
      meta: z.record(z.string(), z.any()).optional().describe('Arbitrary metadata')
    })
  )
  .output(
    z.object({
      spaceId: z.string().describe('Space ID'),
      name: z.string().optional().describe('Space name'),
      description: z.string().optional().describe('Space description'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let { action, spaceId, name, description, meta } = ctx.input;

    if (action === 'create') {
      let result = await client.createSpace({ name, description, meta });
      return {
        output: {
          spaceId: result.id,
          name: result.name,
          description: result.description,
          createdAt: result.createdAt
        },
        message: `Space **${result.name || result.id}** created.`
      };
    }

    if (action === 'fetch') {
      if (!spaceId) throw new Error('spaceId is required for fetch');
      let result = await client.fetchSpace(spaceId);
      return {
        output: {
          spaceId: result.id,
          name: result.name,
          description: result.description,
          createdAt: result.createdAt
        },
        message: `Fetched space **${result.name || result.id}**.`
      };
    }

    if (action === 'update') {
      if (!spaceId) throw new Error('spaceId is required for update');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (meta !== undefined) updateData.meta = meta;
      await client.updateSpace(spaceId, updateData);
      return {
        output: { spaceId, name, description },
        message: `Space **${spaceId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!spaceId) throw new Error('spaceId is required for delete');
      await client.deleteSpace(spaceId);
      return {
        output: { spaceId },
        message: `Space **${spaceId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
