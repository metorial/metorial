import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let parameterSchema = z
  .object({
    type: z
      .string()
      .optional()
      .describe('Parameter type (e.g., "template", "boolean", "integer", "list", "map")'),
    key: z.string().optional().describe('Parameter key'),
    value: z.string().optional().describe('Parameter value'),
    list: z.array(z.any()).optional().describe('List parameter values'),
    map: z.array(z.any()).optional().describe('Map parameter values')
  })
  .describe('GTM parameter');

let tagOutputSchema = z.object({
  tagId: z.string().optional().describe('Tag ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  workspaceId: z.string().optional().describe('Parent workspace ID'),
  name: z.string().optional().describe('Tag name'),
  type: z.string().optional().describe('Tag type (e.g., "ua", "awct", "html", "img")'),
  firingTriggerId: z.array(z.string()).optional().describe('Trigger IDs that fire this tag'),
  blockingTriggerId: z
    .array(z.string())
    .optional()
    .describe('Trigger IDs that block this tag'),
  paused: z.boolean().optional().describe('Whether the tag is paused'),
  notes: z.string().optional().describe('Tag notes'),
  parameter: z.array(parameterSchema).optional().describe('Tag parameters'),
  fingerprint: z.string().optional().describe('Tag fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI'),
  parentFolderId: z.string().optional().describe('Parent folder ID'),
  tagFiringOption: z.string().optional().describe('Tag firing option')
});

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create, list, get, update, delete, or revert tags in a GTM workspace. Tags represent tracking code snippets (like analytics or marketing pixels) that fire based on trigger conditions.`,
  instructions: [
    'Use "list" to see all tags in a workspace.',
    'When creating a tag, specify the tag type and firing trigger IDs.',
    'The "revert" action undoes all workspace changes to a specific tag.',
    'Common tag types: "html" (Custom HTML), "img" (Custom Image), "ua" (Universal Analytics), "gaawc" (GA4 Config), "gaawe" (GA4 Event).',
    'Parameters are type-specific. Use "template" type for most string values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageTag)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete', 'revert'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().describe('GTM workspace ID'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID (required for get, update, delete, revert)'),
      name: z.string().optional().describe('Tag name (required for create)'),
      type: z.string().optional().describe('Tag type identifier (required for create)'),
      firingTriggerId: z
        .array(z.string())
        .optional()
        .describe('Trigger IDs that cause this tag to fire'),
      blockingTriggerId: z
        .array(z.string())
        .optional()
        .describe('Trigger IDs that prevent this tag from firing'),
      parameter: z.array(parameterSchema).optional().describe('Tag configuration parameters'),
      paused: z.boolean().optional().describe('Whether the tag should be paused'),
      notes: z.string().optional().describe('Tag notes'),
      parentFolderId: z.string().optional().describe('Folder ID to organize this tag in'),
      tagFiringOption: z
        .enum(['oncePerEvent', 'oncePerLoad', 'unlimited'])
        .optional()
        .describe('How often the tag fires')
    })
  )
  .output(
    z.object({
      tag: tagOutputSchema.optional().describe('Tag details (for single-tag operations)'),
      tags: z.array(tagOutputSchema).optional().describe('List of tags (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, workspaceId, tagId } = ctx.input;

    if (action === 'list') {
      let response = await client.listTags(accountId, containerId, workspaceId);
      let tags = response.tag || [];
      return {
        output: { tags } as any,
        message: `Found **${tags.length}** tag(s) in workspace \`${workspaceId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a tag');
      if (!ctx.input.type) throw new Error('Type is required for creating a tag');

      let tagData: Record<string, unknown> = {
        name: ctx.input.name,
        type: ctx.input.type
      };
      if (ctx.input.firingTriggerId) tagData.firingTriggerId = ctx.input.firingTriggerId;
      if (ctx.input.blockingTriggerId) tagData.blockingTriggerId = ctx.input.blockingTriggerId;
      if (ctx.input.parameter) tagData.parameter = ctx.input.parameter;
      if (ctx.input.paused !== undefined) tagData.paused = ctx.input.paused;
      if (ctx.input.notes) tagData.notes = ctx.input.notes;
      if (ctx.input.parentFolderId) tagData.parentFolderId = ctx.input.parentFolderId;
      if (ctx.input.tagFiringOption) tagData.tagFiringOption = ctx.input.tagFiringOption;

      let tag = await client.createTag(accountId, containerId, workspaceId, tagData);
      return {
        output: { tag } as any,
        message: `Created tag **"${tag.name}"** (ID: \`${tag.tagId}\`, type: \`${tag.type}\`)`
      };
    }

    if (!tagId)
      throw new Error('tagId is required for get, update, delete, and revert actions');

    if (action === 'get') {
      let tag = await client.getTag(accountId, containerId, workspaceId, tagId);
      return {
        output: { tag } as any,
        message: `Retrieved tag **"${tag.name}"** (type: \`${tag.type}\`)`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.type !== undefined) updateData.type = ctx.input.type;
      if (ctx.input.firingTriggerId !== undefined)
        updateData.firingTriggerId = ctx.input.firingTriggerId;
      if (ctx.input.blockingTriggerId !== undefined)
        updateData.blockingTriggerId = ctx.input.blockingTriggerId;
      if (ctx.input.parameter !== undefined) updateData.parameter = ctx.input.parameter;
      if (ctx.input.paused !== undefined) updateData.paused = ctx.input.paused;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
      if (ctx.input.parentFolderId !== undefined)
        updateData.parentFolderId = ctx.input.parentFolderId;
      if (ctx.input.tagFiringOption !== undefined)
        updateData.tagFiringOption = ctx.input.tagFiringOption;

      let tag = await client.updateTag(accountId, containerId, workspaceId, tagId, updateData);
      return {
        output: { tag } as any,
        message: `Updated tag **"${tag.name}"** (ID: \`${tag.tagId}\`)`
      };
    }

    if (action === 'delete') {
      await client.deleteTag(accountId, containerId, workspaceId, tagId);
      return {
        output: { tag: { tagId, accountId, containerId, workspaceId } } as any,
        message: `Deleted tag \`${tagId}\``
      };
    }

    // revert
    let tag = await client.revertTag(accountId, containerId, workspaceId, tagId);
    return {
      output: { tag } as any,
      message: `Reverted tag \`${tagId}\` to its last published state`
    };
  })
  .build();
