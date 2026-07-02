import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageClientTags = SlateTool.create(spec, {
  name: 'Manage Client Tags',
  key: 'manage_client_tags',
  description: `Add or remove tags on a client. Tags enable segmentation and can trigger automation workflows. You can also create, list, and delete tag definitions.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add_tags', 'remove_tags', 'create_tag', 'list_tags', 'delete_tag'])
        .describe('Action to perform'),
      clientId: z
        .string()
        .optional()
        .describe('Client ID (required for add_tags and remove_tags)'),
      tagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to add or remove from the client'),
      tagName: z.string().optional().describe('Tag name (for create_tag)'),
      tagId: z.string().optional().describe('Tag ID (for delete_tag)'),
      search: z.string().optional().describe('Search filter (for list_tags)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      tags: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of tags (for list_tags)'),
      tag: z.record(z.string(), z.any()).optional().describe('Created tag (for create_tag)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'add_tags') {
      if (!ctx.input.clientId || !ctx.input.tagNames?.length) {
        throw new Error('clientId and tagNames are required for add_tags');
      }
      await client.addClientTags(ctx.input.clientId, ctx.input.tagNames);
      return {
        output: { success: true },
        message: `Added tags **${ctx.input.tagNames.join(', ')}** to client ${ctx.input.clientId}.`
      };
    }

    if (action === 'remove_tags') {
      if (!ctx.input.clientId || !ctx.input.tagNames?.length) {
        throw new Error('clientId and tagNames are required for remove_tags');
      }
      await client.removeClientTags(ctx.input.clientId, ctx.input.tagNames);
      return {
        output: { success: true },
        message: `Removed tags **${ctx.input.tagNames.join(', ')}** from client ${ctx.input.clientId}.`
      };
    }

    if (action === 'create_tag') {
      if (!ctx.input.tagName) throw new Error('tagName is required for create_tag');
      let result = await client.createClientTag({ name: ctx.input.tagName });
      return {
        output: { success: true, tag: result },
        message: `Created client tag **${ctx.input.tagName}**.`
      };
    }

    if (action === 'list_tags') {
      let result = await client.listClientTags({ search: ctx.input.search });
      let tags = Array.isArray(result) ? result : result.tags || result.data || [];
      return {
        output: { success: true, tags },
        message: `Found **${tags.length}** client tag(s).`
      };
    }

    if (action === 'delete_tag') {
      if (!ctx.input.tagId) throw new Error('tagId is required for delete_tag');
      await client.deleteClientTag(ctx.input.tagId);
      return {
        output: { success: true },
        message: `Deleted client tag ${ctx.input.tagId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
