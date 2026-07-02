import { SlateTool } from 'slates';
import { z } from 'zod';
import { PostalyticsClient } from '../lib/client';
import { spec } from '../spec';

export let manageSuppressionLists = SlateTool.create(spec, {
  name: 'Manage Suppression Lists',
  key: 'manage_suppression_lists',
  description: `List suppression lists and add contacts to a suppression list. Suppression lists prevent specific contacts from receiving mailings, useful for opt-outs, existing customers, or do-not-mail lists.`,
  instructions: [
    'Use action "list" to see all suppression lists.',
    'Use action "add_contact" to add a contact to a suppression list by listId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add_contact']).describe('The action to perform'),
      listId: z.string().optional().describe('Suppression list ID (required for add_contact)'),
      contact: z
        .object({
          firstName: z.string().describe('First name'),
          lastName: z.string().describe('Last name'),
          company: z.string().optional().describe('Company name'),
          addressStreet: z.string().describe('Street address'),
          addressStreet2: z.string().optional().describe('Street address line 2'),
          addressCity: z.string().describe('City'),
          addressState: z.string().describe('State abbreviation'),
          addressZip: z.string().describe('ZIP code')
        })
        .optional()
        .describe('Contact to add to suppression list (required for add_contact)')
    })
  )
  .output(
    z.object({
      suppressionLists: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Array of suppression lists'),
      result: z.record(z.string(), z.unknown()).optional().describe('Operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PostalyticsClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let suppressionLists = await client.getSuppressionLists();
      return {
        output: { suppressionLists },
        message: `Found **${suppressionLists.length}** suppression list(s).`
      };
    }

    if (action === 'add_contact') {
      if (!ctx.input.listId) throw new Error('listId is required for add_contact action');
      if (!ctx.input.contact) throw new Error('contact is required for add_contact action');
      let result = await client.addSuppressedContact(ctx.input.listId, {
        firstName: ctx.input.contact.firstName,
        lastName: ctx.input.contact.lastName,
        company: ctx.input.contact.company,
        addressStreet: ctx.input.contact.addressStreet,
        addressStreet2: ctx.input.contact.addressStreet2,
        addressCity: ctx.input.contact.addressCity,
        addressState: ctx.input.contact.addressState,
        addressZip: ctx.input.contact.addressZip
      });
      return {
        output: { result },
        message: `Contact **${ctx.input.contact.firstName} ${ctx.input.contact.lastName}** added to suppression list.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
