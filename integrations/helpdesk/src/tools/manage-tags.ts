import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  id: z.string().describe('Unique tag identifier'),
  name: z.string().describe('Tag name'),
  teamIDs: z.array(z.string()).optional().describe('IDs of teams this tag is scoped to'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the tag was created'),
  updatedAt: z.string().optional().describe('ISO 8601 timestamp when the tag was last updated')
});

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, get, create, update, and delete HelpDesk tags. Tags are labels that can be applied to tickets for categorization, filtering, and automation. Tags can optionally be scoped to specific teams.`,
  instructions: [
    'Use "list" to retrieve all tags in the account.',
    'Use "get" with a tagId to retrieve a specific tag.',
    'Use "create" with a name to create a new tag. Optionally scope it to specific teams via teamIDs.',
    'Use "update" with a tagId plus fields to modify an existing tag.',
    'Use "delete" with a tagId to remove a tag.'
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
        .describe('Operation to perform on tags'),
      tagId: z.string().optional().describe('Tag ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create, optional for update)'),
      teamIDs: z
        .array(z.string())
        .optional()
        .describe('Team IDs to scope this tag to (optional for create and update)')
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema).optional().describe('List of tags (for list action)'),
      tag: tagSchema
        .optional()
        .describe('Single tag details (for get, create, update actions)'),
      deleted: z.boolean().optional().describe('Whether the tag was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let tags = await client.listTags();
      return {
        output: { tags },
        message: `Found **${tags.length}** tag(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.tagId) {
        throw new Error('tagId is required for the "get" action');
      }
      let tag = await client.getTag(ctx.input.tagId);
      return {
        output: { tag },
        message: `Retrieved tag **${tag.name}** (${tag.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for the "create" action');
      }
      let input: Record<string, unknown> = {
        name: ctx.input.name
      };
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;

      let tag = await client.createTag(input as any);
      return {
        output: { tag },
        message: `Created tag **${tag.name}** (${tag.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.tagId) {
        throw new Error('tagId is required for the "update" action');
      }
      let input: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;

      let tag = await client.updateTag(ctx.input.tagId, input as any);
      return {
        output: { tag },
        message: `Updated tag **${tag.name}** (${tag.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tagId) {
        throw new Error('tagId is required for the "delete" action');
      }
      await client.deleteTag(ctx.input.tagId);
      return {
        output: { deleted: true },
        message: `Deleted tag **${ctx.input.tagId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
