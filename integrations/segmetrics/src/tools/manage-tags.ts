import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.union([
  z.string().describe('Tag name or tag ID.'),
  z.object({
    id: z.string().optional().describe('Tag ID.'),
    name: z.string().optional().describe('Tag name.'),
    date: z.string().optional().describe('Date the tag was applied (YYYY-MM-DD HH:MM:SS).')
  })
]);

export let manageTags = SlateTool.create(spec, {
  name: 'Add or Remove Tags',
  key: 'manage_tags',
  description: `Adds or removes tags from a contact in SegMetrics. Tags can be specified as tag IDs, tag names, or full tag objects with id, name, and date.
Use this to sync segmentation or lifecycle stage data from external systems.`,
  instructions: [
    'Provide either contactId or email to identify the contact.',
    'Set action to "add" to add tags, or "remove" to remove tags.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the specified tags.'),
      contactId: z.string().optional().describe('The contact ID to modify tags for.'),
      email: z
        .string()
        .optional()
        .describe('The email address of the contact to modify tags for.'),
      tags: z
        .array(tagSchema)
        .describe(
          'Array of tags to add or remove. Each tag can be a string (name or ID) or an object with id, name, and/or date fields.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      integrationId: ctx.config.integrationId!
    });

    let params = {
      contactId: ctx.input.contactId,
      email: ctx.input.email,
      tags: ctx.input.tags
    };

    let response: Record<string, unknown>;
    if (ctx.input.action === 'add') {
      response = await client.addTags(params);
    } else {
      response = await client.removeTags(params);
    }

    let identifier = ctx.input.email || ctx.input.contactId || 'unknown';
    let tagCount = ctx.input.tags.length;
    return {
      output: {
        success: true,
        response
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} **${tagCount}** tag(s) ${ctx.input.action === 'add' ? 'to' : 'from'} contact **${identifier}**.`
    };
  })
  .build();
