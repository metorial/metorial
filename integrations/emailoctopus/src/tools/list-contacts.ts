import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve contacts from a list. Supports filtering by subscription status, tag, and creation/update dates. Returns paginated results with up to 100 contacts per page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve contacts from'),
      status: z
        .enum(['SUBSCRIBED', 'UNSUBSCRIBED', 'PENDING'])
        .optional()
        .describe('Filter by subscription status'),
      tag: z.string().optional().describe('Filter by tag name'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter contacts created before this ISO 8601 date'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter contacts created after this ISO 8601 date'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Filter contacts updated before this ISO 8601 date'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter contacts updated after this ISO 8601 date'),
      startingAfter: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          contactId: z.string().describe('Unique identifier of the contact'),
          emailAddress: z.string().describe('Email address of the contact'),
          fields: z.record(z.string(), z.string()).describe('Custom field values'),
          tags: z.array(z.string()).describe('Tags assigned to the contact'),
          status: z.string().describe('Subscription status'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          lastUpdatedAt: z.string().describe('ISO 8601 last update timestamp')
        })
      ),
      pagingNext: z
        .string()
        .nullable()
        .describe('Cursor for the next page, null if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getContacts(ctx.input.listId, {
      status: ctx.input.status,
      tag: ctx.input.tag,
      createdBefore: ctx.input.createdBefore,
      createdAfter: ctx.input.createdAfter,
      updatedBefore: ctx.input.updatedBefore,
      updatedAfter: ctx.input.updatedAfter,
      startingAfter: ctx.input.startingAfter
    });

    return {
      output: {
        contacts: result.data,
        pagingNext: result.pagingNext
      },
      message: `Retrieved ${result.data.length} contact(s).${result.pagingNext ? ' More results available.' : ''}`
    };
  })
  .build();
