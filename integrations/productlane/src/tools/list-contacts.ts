import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactId: z.string().describe('Unique ID of the contact'),
  email: z.string().describe('Contact email address'),
  name: z.string().nullable().describe('Contact name'),
  imageUrl: z.string().nullable().describe('Contact profile image URL'),
  companyId: z.string().nullable().describe('Associated company ID'),
  workspaceId: z.string().describe('Workspace ID'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last updated timestamp')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts in your Productlane workspace. Supports filtering by email or company, and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter contacts by email address'),
      companyId: z.string().optional().describe('Filter contacts by company ID'),
      skip: z.number().optional().describe('Number of records to skip for pagination'),
      take: z.number().optional().describe('Number of records to return (max 100)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      hasMore: z.boolean().describe('Whether more results are available'),
      count: z.number().describe('Total count of contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listContacts({
      email: ctx.input.email,
      companyId: ctx.input.companyId,
      skip: ctx.input.skip,
      take: ctx.input.take
    });

    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: c.id,
      email: c.email,
      name: c.name ?? null,
      imageUrl: c.imageUrl ?? null,
      companyId: c.companyId ?? null,
      workspaceId: c.workspaceId,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    return {
      output: {
        contacts,
        hasMore: result.hasMore ?? false,
        count: result.count ?? contacts.length
      },
      message: `Found **${result.count ?? contacts.length}** contacts.${result.hasMore ? ' More results are available.' : ''}`
    };
  })
  .build();
