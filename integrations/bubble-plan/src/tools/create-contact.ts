import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Project Bubble. Contacts represent people associated with clients and can include phone, email, and role information.`
})
  .input(
    z.object({
      contactName: z.string().describe('Name of the contact'),
      email: z.string().optional().describe('Email address'),
      tel: z.string().optional().describe('Telephone number'),
      fax: z.string().optional().describe('Fax number'),
      mobile: z.string().optional().describe('Mobile number'),
      role: z.string().optional().describe('Contact role/title'),
      companyName: z.string().optional().describe('Company name'),
      clientId: z.string().optional().describe('Client ID to associate the contact with')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      contactName: z.string().describe('Name of the created contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.config.domain
    });

    let result = await client.createContact({
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
        contactId: String(c.contact_id),
        contactName: c.contact_name || ctx.input.contactName
      },
      message: `Created contact **${c.contact_name || ctx.input.contactName}**.`
    };
  })
  .build();
