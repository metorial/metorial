import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update an existing contact in Project Bubble. Modify their name, email, phone, role, or client association.`
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to update'),
      contactName: z.string().optional().describe('New contact name'),
      email: z.string().optional().describe('New email address'),
      tel: z.string().optional().describe('New telephone number'),
      fax: z.string().optional().describe('New fax number'),
      mobile: z.string().optional().describe('New mobile number'),
      role: z.string().optional().describe('New role/title'),
      companyName: z.string().optional().describe('New company name'),
      clientId: z.string().optional().describe('New client ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the updated contact'),
      contactName: z.string().describe('Name of the updated contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.updateContact(ctx.input.contactId, {
      contactName: ctx.input.contactName,
      email: ctx.input.email,
      tel: ctx.input.tel,
      fax: ctx.input.fax,
      mobile: ctx.input.mobile,
      role: ctx.input.role,
      companyName: ctx.input.companyName,
      clientId: ctx.input.clientId
    });

    let c = result?.data?.[0] || result?.data || result;

    return {
      output: {
        contactId: String(c.contact_id || ctx.input.contactId),
        contactName: c.contact_name || ''
      },
      message: `Updated contact **${c.contact_name || ctx.input.contactId}**.`
    };
  })
  .build();
