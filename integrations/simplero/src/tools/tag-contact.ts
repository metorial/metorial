import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let tagContact = SlateTool.create(spec, {
  name: 'Tag Contact',
  key: 'tag_contact',
  description: `Add or remove tags from a contact in Simplero. Identify the contact by email, ID, or token. Supports adding and removing tags by name, or using tag IDs for more precise control.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['add', 'remove']).describe('Whether to add or remove the tag'),
      email: z.string().optional().describe('Contact email address'),
      contactId: z.string().optional().describe('Simplero internal contact ID'),
      contactToken: z.string().optional().describe('Simplero contact token'),
      tagName: z.string().optional().describe('Name of the tag to add or remove'),
      tagId: z
        .string()
        .optional()
        .describe('ID of the tag (alternative to tagName, uses tag-specific endpoints)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      contact: z.record(z.string(), z.unknown()).optional().describe('Updated contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    let identifier = {
      email: ctx.input.email,
      contactId: ctx.input.contactId,
      contactToken: ctx.input.contactToken
    };

    if (ctx.input.tagId) {
      if (ctx.input.action === 'add') {
        await client.tagContactById(ctx.input.tagId, identifier);
      } else {
        await client.untagContactById(ctx.input.tagId, identifier);
      }
      return {
        output: { success: true },
        message: `Tag ID **${ctx.input.tagId}** ${ctx.input.action === 'add' ? 'added to' : 'removed from'} contact.`
      };
    }

    if (!ctx.input.tagName) {
      throw new Error('Either tagName or tagId must be provided.');
    }

    if (ctx.input.action === 'add') {
      let result = await client.addTagToContact(identifier, ctx.input.tagName);
      return {
        output: { success: true, contact: result },
        message: `Tag **${ctx.input.tagName}** added to contact.`
      };
    }

    let result = await client.removeTagFromContact(identifier, ctx.input.tagName);
    return {
      output: { success: true, contact: result },
      message: `Tag **${ctx.input.tagName}** removed from contact.`
    };
  })
  .build();
