import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactTags = SlateTool.create(spec, {
  name: 'Manage Contact Tags',
  key: 'manage_contact_tags',
  description: `Adds or removes tags from a contact. Use the action field to specify whether to add or remove tags. When removing, provide the contactTag IDs (not tag IDs) — these can be obtained from the Get Contact tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the tag'),
      tagId: z
        .string()
        .optional()
        .describe('ID of the tag to add (required when action is "add")'),
      contactTagId: z
        .string()
        .optional()
        .describe(
          'ID of the contactTag association to remove (required when action is "remove")'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      contactTagId: z
        .string()
        .optional()
        .describe('ID of the new contact-tag association (when adding)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    if (ctx.input.action === 'add') {
      if (!ctx.input.tagId) {
        throw new Error('tagId is required when adding a tag');
      }
      let result = await client.addTagToContact(ctx.input.contactId, ctx.input.tagId);
      return {
        output: {
          success: true,
          contactTagId: result.contactTag?.id
        },
        message: `Tag (ID: ${ctx.input.tagId}) added to contact (ID: ${ctx.input.contactId}).`
      };
    } else {
      if (!ctx.input.contactTagId) {
        throw new Error('contactTagId is required when removing a tag');
      }
      await client.removeTagFromContact(ctx.input.contactTagId);
      return {
        output: { success: true },
        message: `Tag removed from contact (ID: ${ctx.input.contactId}).`
      };
    }
  })
  .build();
