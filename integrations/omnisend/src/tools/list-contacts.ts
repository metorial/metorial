import { SlateTool } from 'slates';
import { z } from 'zod';
import { OmnisendClient } from '../lib/client';
import { spec } from '../spec';

let contactSummarySchema = z.object({
  contactId: z.string().describe('Omnisend contact ID'),
  email: z.string().optional().describe('Contact email'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  phone: z.array(z.string()).optional().describe('Phone numbers'),
  status: z.string().optional().describe('Email subscription status'),
  tags: z.array(z.string()).optional().describe('Contact tags'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts from Omnisend with filtering and pagination. Filter by email, phone, subscription status, segment, tag, or recent updates.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by email address'),
      phone: z.string().optional().describe('Filter by phone number'),
      status: z
        .enum(['subscribed', 'nonSubscribed', 'unsubscribed'])
        .optional()
        .describe('Filter by email subscription status'),
      segmentId: z.string().optional().describe('Filter by segment ID'),
      tag: z.string().optional().describe('Filter by contact tag'),
      limit: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of results (max 250, default 100)'),
      cursor: z.string().optional().describe('Pagination cursor for next page'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter contacts updated after this timestamp (RFC3339)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSummarySchema).describe('List of contacts'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      previousCursor: z.string().optional().describe('Cursor for previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OmnisendClient(ctx.auth.token);

    let result = await client.listContacts({
      email: ctx.input.email,
      phone: ctx.input.phone,
      status: ctx.input.status,
      segmentID: ctx.input.segmentId,
      tag: ctx.input.tag,
      limit: ctx.input.limit,
      after: ctx.input.cursor,
      updatedAfter: ctx.input.updatedAfter
    });

    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: c.contactID,
      email: c.email,
      firstName: c.firstName,
      lastName: c.lastName,
      phone: c.phone,
      status: c.status,
      tags: c.tags,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));

    let nextCursor = result.paging?.next
      ? (new URL(result.paging.next).searchParams.get('after') ?? undefined)
      : undefined;
    let previousCursor = result.paging?.previous
      ? (new URL(result.paging.previous).searchParams.get('before') ?? undefined)
      : undefined;

    return {
      output: {
        contacts,
        nextCursor,
        previousCursor
      },
      message: `Retrieved **${contacts.length}** contacts${nextCursor ? ' (more available)' : ''}.`
    };
  })
  .build();
