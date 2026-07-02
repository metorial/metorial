import { SlateTool } from 'slates';
import { z } from 'zod';
import { NutshellClient } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Nutshell CRM. Provide the contact ID and the fields to update. The current revision is fetched automatically for concurrency control.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      rev: z
        .string()
        .optional()
        .describe(
          'Revision identifier for concurrency control. If not provided, the current revision will be fetched automatically. Use "REV_IGNORE" to bypass revision checking.'
        ),
      name: z.string().optional().describe('Updated full name'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Updated email addresses (replaces existing)'),
      phones: z
        .array(z.string())
        .optional()
        .describe('Updated phone numbers (replaces existing)'),
      address: z
        .object({
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional()
        })
        .optional()
        .describe('Updated mailing address'),
      title: z.string().optional().describe('Updated job title'),
      description: z.string().optional().describe('Updated description'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values to set. Set a value to null to remove it.')
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the updated contact'),
      rev: z.string().describe('New revision identifier'),
      name: z.string().describe('Name of the updated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NutshellClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let rev = ctx.input.rev;
    if (!rev) {
      let existing = await client.getContact(ctx.input.contactId);
      rev = String(existing.rev);
    }

    let contactData: Record<string, any> = {};
    if (ctx.input.name !== undefined) contactData.name = ctx.input.name;
    if (ctx.input.emails !== undefined) contactData.email = ctx.input.emails;
    if (ctx.input.phones !== undefined) contactData.phone = ctx.input.phones;
    if (ctx.input.address !== undefined) contactData.address = ctx.input.address;
    if (ctx.input.title !== undefined) contactData.title = ctx.input.title;
    if (ctx.input.description !== undefined) contactData.description = ctx.input.description;
    if (ctx.input.customFields !== undefined)
      contactData.customFields = ctx.input.customFields;

    let result = await client.editContact(ctx.input.contactId, rev, contactData);

    return {
      output: {
        contactId: result.id,
        rev: String(result.rev),
        name: result.name
      },
      message: `Updated contact **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
