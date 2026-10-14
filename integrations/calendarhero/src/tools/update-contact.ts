import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact's information in CalendarHero. Only the fields you provide will be updated.`
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      name: z.string().optional().describe('Updated full name'),
      title: z.string().optional().describe('Updated job title'),
      organization: z.string().optional().describe('Updated organization name'),
      emails: z.array(z.string()).optional().describe('Updated email addresses'),
      defaultEmail: z.string().optional().describe('Updated preferred email address'),
      phoneNumbers: z.array(z.string()).optional().describe('Updated phone numbers')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('Contact ID'),
      name: z.string().optional().describe('Updated name'),
      email: z.string().optional().describe('Primary email'),
      raw: z.any().optional().describe('Full updated contact response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let changes = pickDefined({
      name: ctx.input.name,
      title: ctx.input.title,
      organization: ctx.input.organization,
      defaultEmail: ctx.input.defaultEmail,
      email: ctx.input.emails,
      telephone: ctx.input.phoneNumbers
    });
    if (Object.keys(changes).length === 0) {
      throw createApiServiceError('Provide at least one contact field to update.');
    }
    let emails = ctx.input.emails;
    if (emails === undefined) {
      let contact = await client.getContact(ctx.input.contactId, { basic: true });
      emails = Array.isArray(contact.email)
        ? contact.email
        : contact.email
          ? [contact.email]
          : [];
    }
    if (!emails?.length || emails.some((email: string) => !email.trim())) {
      throw createApiServiceError(
        'CalendarHero requires at least one email address. Provide a non-empty emails array.'
      );
    }
    let updateData = { ...changes, email: emails };

    let result = await client.updateContact(ctx.input.contactId, updateData);

    return {
      output: {
        contactId: result?._id || result?.id || ctx.input.contactId,
        name: result?.name || ctx.input.name,
        email: Array.isArray(result?.email) ? result.email[0] : result?.email,
        raw: result
      },
      message: `Contact **${ctx.input.contactId}** updated.`
    };
  })
  .build();
