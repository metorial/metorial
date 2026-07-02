import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Updates an existing contact in SuiteDash CRM. You can update standard fields like name, email, and role, as well as any custom fields configured in your account. Use the **Get Metadata** tool to discover available custom fields.`,
  instructions: [
    'The contact UID is required to identify which contact to update.',
    'Use the Get Metadata tool to discover custom field keys for your account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactUid: z.string().describe('UID of the contact to update'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated email address'),
      role: z.enum(['lead', 'prospect', 'client']).optional().describe('Updated role'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional custom fields to update as key-value pairs')
    })
  )
  .output(
    z.object({
      contact: z.record(z.string(), z.unknown()).describe('The updated contact record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    let payload: Record<string, unknown> = {
      uid: ctx.input.contactUid
    };

    if (ctx.input.firstName !== undefined) payload.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) payload.last_name = ctx.input.lastName;
    if (ctx.input.email !== undefined) payload.email = ctx.input.email;
    if (ctx.input.role !== undefined) payload.role = ctx.input.role;
    if (ctx.input.customFields) {
      Object.assign(payload, ctx.input.customFields);
    }

    let result = await client.updateContact(payload);

    return {
      output: { contact: result },
      message: `Updated contact **${ctx.input.contactUid}**.`
    };
  })
  .build();
