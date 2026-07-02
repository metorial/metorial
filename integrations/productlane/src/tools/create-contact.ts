import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createContact = SlateTool.create(spec, {
  name: 'Create Contact',
  key: 'create_contact',
  description: `Create a new contact in Productlane. Contacts represent individuals who provide feedback or interact through support channels. You can optionally link the contact to an existing company.`
})
  .input(
    z.object({
      email: z.string().describe('Contact email address'),
      name: z.string().optional().describe('Contact name'),
      companyId: z.string().optional().describe('Link to a company by ID'),
      companyName: z
        .string()
        .optional()
        .describe('Link to a company by name (creates if not found)'),
      companyExternalId: z.string().optional().describe('Link to a company by external ID')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the created contact'),
      email: z.string().describe('Contact email address'),
      name: z.string().nullable().describe('Contact name'),
      companyId: z.string().nullable().describe('Associated company ID'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createContact(ctx.input);

    return {
      output: {
        contactId: result.id,
        email: result.email,
        name: result.name ?? null,
        companyId: result.companyId ?? null,
        createdAt: result.createdAt
      },
      message: `Created contact **${result.name || result.email}** (${result.id}).`
    };
  })
  .build();
