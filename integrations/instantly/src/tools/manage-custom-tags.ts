import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let manageCustomTags = SlateTool.create(spec, {
  name: 'Manage Custom Tags',
  key: 'manage_custom_tags',
  description: `List, create, delete custom tags, and assign or unassign tags to campaigns and email accounts. Tags help organize and filter resources in the workspace.`,
  instructions: [
    'Use action "list" to view existing tags.',
    'Use action "create" to create a new tag.',
    'Use action "delete" to remove a tag by its ID.',
    'Use action "assign" or "unassign" to link/unlink a tag to/from campaigns or accounts by providing the tag ID and resource IDs.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'delete', 'assign', 'unassign'])
        .describe('Action to perform.'),
      tagName: z
        .string()
        .optional()
        .describe('Name of the tag to create (for "create" action).'),
      tagId: z
        .string()
        .optional()
        .describe('ID of the tag (for "delete", "assign", "unassign" actions).'),
      resourceIds: z
        .array(z.string())
        .optional()
        .describe(
          'IDs of campaigns or accounts to assign/unassign the tag (for "assign"/"unassign" actions).'
        ),
      resourceType: z
        .enum(['account', 'campaign'])
        .optional()
        .describe(
          'Required for assign/unassign: whether the resource IDs identify sending accounts or campaigns.'
        ),
      search: z.string().optional().describe('Search tags by name (for "list" action).'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of tags to return (for "list" action).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().optional().describe('Tag name')
          })
        )
        .optional()
        .describe('List of tags (for "list" action)'),
      nextStartingAfter: z.string().nullable().optional().describe('Cursor for next page'),
      createdTag: z.any().optional().describe('Created tag details'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listCustomTags({
        limit: ctx.input.limit,
        startingAfter: ctx.input.startingAfter,
        search: ctx.input.search
      });

      let tags = result.items.map((t: any) => ({
        tagId: t.id,
        name: t.label
      }));

      return {
        output: {
          tags,
          nextStartingAfter: result.next_starting_after ?? null,
          success: true
        },
        message: `Found **${tags.length}** custom tag(s).`
      };
    }

    if (action === 'create' && ctx.input.tagName) {
      let result = await client.createCustomTag({ name: ctx.input.tagName });
      return {
        output: { createdTag: result, success: true },
        message: `Created tag **${ctx.input.tagName}**.`
      };
    }

    if (action === 'delete' && ctx.input.tagId) {
      await client.deleteCustomTag(ctx.input.tagId);
      return {
        output: { success: true },
        message: `Deleted tag ${ctx.input.tagId}.`
      };
    }

    if (
      (action === 'assign' || action === 'unassign') &&
      ctx.input.tagId &&
      ctx.input.resourceIds
    ) {
      if (!ctx.input.resourceType || !ctx.input.resourceIds.length) {
        throw invalid(
          'Provide resourceType and a non-empty resourceIds array to assign or unassign tags.'
        );
      }
      await client.toggleTagResource({
        tagId: ctx.input.tagId,
        resourceIds: ctx.input.resourceIds,
        resourceType: ctx.input.resourceType,
        assign: action === 'assign'
      });
      return {
        output: { success: true },
        message: `${action === 'assign' ? 'Assigned' : 'Unassigned'} tag ${ctx.input.tagId} ${action === 'assign' ? 'to' : 'from'} ${ctx.input.resourceIds.length} resource(s).`
      };
    }

    throw invalid('Provide the required fields for the selected action.');
  })
  .build();
