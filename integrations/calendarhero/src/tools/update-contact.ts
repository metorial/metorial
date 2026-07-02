import { SlateTool } from 'slates';
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

    let updateData: any = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.title !== undefined) updateData.title = ctx.input.title;
    if (ctx.input.organization !== undefined) updateData.organization = ctx.input.organization;
    if (ctx.input.emails !== undefined) updateData.email = ctx.input.emails;
    if (ctx.input.phoneNumbers !== undefined) updateData.telephone = ctx.input.phoneNumbers;

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
