import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContactTool = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `View or update a contact's information in Lever. Contacts represent unique individuals and are shared across all of their opportunities. Updating a contact affects all their opportunities.`,
  instructions: [
    'Provide contactId to view. Add fields to update them.',
    "Contact changes apply across all of the individual's opportunities."
  ]
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to view or update'),
      name: z.string().optional().describe('Updated full name'),
      headline: z.string().optional().describe('Updated headline or current title'),
      location: z.string().optional().describe('Updated location'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Updated email addresses (replaces existing)'),
      phones: z
        .array(
          z.object({
            type: z.enum(['mobile', 'home', 'work', 'other']).optional(),
            value: z.string()
          })
        )
        .optional()
        .describe('Updated phone numbers (replaces existing)')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      contact: z.any().describe('The contact object'),
      updated: z.boolean().describe('Whether the contact was updated (vs just viewed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let hasUpdates =
      ctx.input.name ||
      ctx.input.headline ||
      ctx.input.location ||
      ctx.input.emails ||
      ctx.input.phones;

    if (hasUpdates) {
      let updateData: Record<string, any> = {};
      if (ctx.input.name) updateData.name = ctx.input.name;
      if (ctx.input.headline) updateData.headline = ctx.input.headline;
      if (ctx.input.location) updateData.location = ctx.input.location;
      if (ctx.input.emails) updateData.emails = ctx.input.emails;
      if (ctx.input.phones) updateData.phones = ctx.input.phones;

      let result = await client.updateContact(ctx.input.contactId, updateData);
      return {
        output: { contactId: result.data.id, contact: result.data, updated: true },
        message: `Updated contact **${result.data.name || ctx.input.contactId}**.`
      };
    }

    let result = await client.getContact(ctx.input.contactId);
    return {
      output: { contactId: result.data.id, contact: result.data, updated: false },
      message: `Retrieved contact **${result.data.name || ctx.input.contactId}**.`
    };
  })
  .build();
