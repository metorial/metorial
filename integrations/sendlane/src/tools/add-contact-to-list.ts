import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let addContactToList = SlateTool.create(spec, {
  name: 'Add Contact to List',
  key: 'add_contact_to_list',
  description: `Add a contact to a specified list. If the contact doesn't exist, it will be created. Requires at least an email or phone number. You can also set custom field values during creation.`,
  instructions: [
    'Either email or phone is required to identify or create the contact.',
    'Custom fields must already exist in your Sendlane account — they cannot be created via the API.'
  ]
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to add the contact to'),
      email: z.string().optional().describe('Contact email address'),
      phone: z.string().optional().describe('Contact phone number'),
      firstName: z.string().optional().describe('Contact first name'),
      lastName: z.string().optional().describe('Contact last name'),
      emailConsent: z
        .boolean()
        .optional()
        .describe('Whether the contact has opted in to email marketing'),
      smsConsent: z
        .boolean()
        .optional()
        .describe('Whether the contact has opted in to SMS marketing'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as key-value pairs (field name → value)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);

    await client.addContactToList(ctx.input.listId, {
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      phone: ctx.input.phone,
      emailConsent: ctx.input.emailConsent,
      smsConsent: ctx.input.smsConsent,
      customFields: ctx.input.customFields
    });

    let identifier = ctx.input.email ?? ctx.input.phone ?? 'contact';

    return {
      output: { success: true },
      message: `Added **${identifier}** to list ${ctx.input.listId}.`
    };
  })
  .build();
