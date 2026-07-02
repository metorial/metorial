import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

let contactSchema = z.object({
  contactUuid: z.string().describe('Refiner internal UUID of the contact'),
  remoteId: z
    .string()
    .nullable()
    .describe('External user ID used when identifying the contact'),
  email: z.string().nullable().describe('Email address of the contact'),
  displayName: z.string().nullable().describe('Display name of the contact'),
  firstSeenAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of when the contact was first seen'),
  lastSeenAt: z
    .string()
    .nullable()
    .describe('ISO 8601 timestamp of when the contact was last seen'),
  attributes: z
    .record(z.string(), z.unknown())
    .describe('Custom traits and attributes of the contact'),
  segments: z
    .array(
      z.object({
        segmentUuid: z.string().describe('UUID of the segment'),
        name: z.string().describe('Name of the segment')
      })
    )
    .describe('Segments the contact belongs to'),
  account: z
    .object({
      accountUuid: z.string().nullable().describe('UUID of the account'),
      remoteId: z.string().nullable().describe('External account ID'),
      displayName: z.string().nullable().describe('Account display name'),
      domain: z.string().nullable().describe('Account domain')
    })
    .nullable()
    .describe('Account the contact is associated with')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `List contacts in your Refiner project with optional filtering. Returns contact details including attributes, segments, and account associations. Supports filtering by survey, segment, or search query, and pagination for large datasets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      orderBy: z
        .enum(['first_seen_at', 'last_seen_at', 'last_form_submission_at'])
        .optional()
        .describe('Sort order for results'),
      surveyUuid: z
        .string()
        .optional()
        .describe('Filter contacts who responded to this survey'),
      segmentUuid: z.string().optional().describe('Filter contacts in this segment'),
      search: z.string().optional().describe('Search by email, ID, or name'),
      page: z.number().optional().describe('Page number for pagination'),
      pageCursor: z
        .string()
        .optional()
        .describe('Cursor for large dataset pagination (recommended for >10,000 entries)'),
      pageLength: z.number().optional().describe('Number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts'),
      pagination: z
        .object({
          itemsCount: z.number().describe('Total number of items'),
          currentPage: z.number().describe('Current page number'),
          lastPage: z.number().describe('Last page number'),
          pageLength: z.number().describe('Items per page'),
          nextPageCursor: z.string().nullable().describe('Cursor for next page')
        })
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.listContacts({
      orderBy: ctx.input.orderBy,
      formUuid: ctx.input.surveyUuid,
      segmentUuid: ctx.input.segmentUuid,
      search: ctx.input.search,
      page: ctx.input.page,
      pageCursor: ctx.input.pageCursor,
      pageLength: ctx.input.pageLength
    })) as any;

    let contacts = (result.items || []).map((item: any) => ({
      contactUuid: item.uuid,
      remoteId: item.remote_id ?? null,
      email: item.email ?? null,
      displayName: item.display_name ?? null,
      firstSeenAt: item.first_seen_at ?? null,
      lastSeenAt: item.last_seen_at ?? null,
      attributes: item.attributes ?? {},
      segments: (item.segments || []).map((s: any) => ({
        segmentUuid: s.uuid,
        name: s.name
      })),
      account: item.account
        ? {
            accountUuid: item.account.uuid ?? null,
            remoteId: item.account.remote_id ?? null,
            displayName: item.account.display_name ?? null,
            domain: item.account.domain ?? null
          }
        : null
    }));

    let pagination = result.pagination || {};

    return {
      output: {
        contacts,
        pagination: {
          itemsCount: pagination.items_count ?? 0,
          currentPage: pagination.current_page ?? 1,
          lastPage: pagination.last_page ?? 1,
          pageLength: pagination.page_length ?? 50,
          nextPageCursor: pagination.next_page_cursor ?? null
        }
      },
      message: `Found **${contacts.length}** contacts (page ${pagination.current_page ?? 1} of ${pagination.last_page ?? 1}).`
    };
  })
  .build();
