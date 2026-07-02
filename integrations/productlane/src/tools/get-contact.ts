import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to retrieve')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('Unique ID of the contact'),
      email: z.string().describe('Contact email address'),
      name: z.string().nullable().describe('Contact name'),
      imageUrl: z.string().nullable().describe('Contact profile image URL'),
      companyId: z.string().nullable().describe('Associated company ID'),
      workspaceId: z.string().describe('Workspace ID'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let c = await client.getContact(ctx.input.contactId);

    return {
      output: {
        contactId: c.id,
        email: c.email,
        name: c.name ?? null,
        imageUrl: c.imageUrl ?? null,
        companyId: c.companyId ?? null,
        workspaceId: c.workspaceId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      },
      message: `Retrieved contact **${c.name || c.email}** (${c.id}).`
    };
  })
  .build();
