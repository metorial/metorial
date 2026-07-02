import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchCredentials = SlateTool.create(spec, {
  name: 'Search Credentials',
  key: 'search_credentials',
  description: `Search and filter credentials with advanced query capabilities. Supports filtering by status, recipient name/email, group, dates, and more. Results are paginated.

Filterable fields include: **id**, **publicId**, **groupId**, **status** (draft/scheduled/issued/expired), **recipient.name**, **recipient.email**, **issueDate**, **expiryDate**, **createdAt**, **updatedAt**.`,
  instructions: [
    'String fields support: equals, contains, startsWith, endsWith, in.',
    'Date fields (YYYY-MM-DD) support: equals, lt, lte, gt, gte.',
    'Use AND/OR/NOT for complex filter logic.',
    'Sortable fields: id, createdAt, updatedAt, issueDate, expiryDate.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .any()
        .optional()
        .describe(
          'Search filter object supporting AND/OR/NOT operators with field-level conditions'
        ),
      sortProperty: z
        .enum(['id', 'createdAt', 'updatedAt', 'issueDate', 'expiryDate'])
        .optional()
        .describe('Field to sort results by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      limit: z.number().optional().describe('Number of results per page (default: 20)'),
      cursor: z.string().optional().describe('Pagination cursor for fetching the next page')
    })
  )
  .output(
    z.object({
      credentials: z
        .array(
          z.object({
            credentialId: z.string().describe('Unique ID of the credential'),
            publicId: z.string().describe('Public UUID'),
            groupId: z.string().describe('Group ID'),
            status: z.string().describe('Credential status'),
            recipientName: z.string().describe('Recipient name'),
            recipientEmail: z.string().optional().describe('Recipient email'),
            issueDate: z.string().describe('Issuance date'),
            expiryDate: z.string().nullable().describe('Expiration date'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('List of matching credentials'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the next page of results'),
      prevCursor: z
        .string()
        .nullable()
        .describe('Cursor for fetching the previous page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sort = ctx.input.sortProperty
      ? { property: ctx.input.sortProperty, order: ctx.input.sortOrder || ('desc' as const) }
      : undefined;

    let result = await client.searchCredentials({
      filter: ctx.input.filter,
      sort,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let credentials = result.data.map(c => ({
      credentialId: c.id,
      publicId: c.publicId,
      groupId: c.groupId,
      status: c.status,
      recipientName: c.recipient.name,
      recipientEmail: c.recipient.email,
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      createdAt: c.createdAt
    }));

    return {
      output: {
        credentials,
        nextCursor: result.pagination.next,
        prevCursor: result.pagination.prev
      },
      message: `Found **${credentials.length}** credential(s).${result.pagination.next ? ' More results available.' : ''}`
    };
  })
  .build();
