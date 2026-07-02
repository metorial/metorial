import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `List, retrieve, update, or delete tags used to categorize and organize conversations. Tags help teams filter and prioritize their workload.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'update', 'delete']).describe('The operation to perform'),
      tagId: z.string().optional().describe('Tag ID (required for get, update, delete)'),
      name: z.string().optional().describe('Tag name (for update)'),
      color: z.string().optional().describe('Tag color (for update)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('List of tags (for list action)'),
      tag: z.record(z.string(), z.any()).optional().describe('Tag details (for get, update)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, tagId, name, color } = ctx.input;

    if (action === 'list') {
      let result = await client.listTags();
      let tags = Array.isArray(result) ? result : (result.tags ?? result.data ?? []);
      return {
        output: { tags, success: true },
        message: `Retrieved ${tags.length} tag(s).`
      };
    }

    if (action === 'get') {
      if (!tagId) throw new Error('tagId is required for get action');
      let tag = await client.getTag(tagId);
      return {
        output: { tag, success: true },
        message: `Retrieved tag **${tagId}**.`
      };
    }

    if (action === 'update') {
      if (!tagId) throw new Error('tagId is required for update action');
      let updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (color !== undefined) updateData.color = color;
      let tag = await client.updateTag(tagId, updateData);
      return {
        output: { tag, success: true },
        message: `Updated tag **${tagId}**.`
      };
    }

    if (action === 'delete') {
      if (!tagId) throw new Error('tagId is required for delete action');
      await client.deleteTag(tagId);
      return {
        output: { success: true },
        message: `Deleted tag **${tagId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
