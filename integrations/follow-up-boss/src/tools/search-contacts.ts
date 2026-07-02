import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchContacts = SlateTool.create(spec, {
  name: 'Search Contacts',
  key: 'search_contacts',
  description: `Search and list contacts in Follow Up Boss. Supports filtering by various criteria, checking for duplicates, and retrieving unclaimed leads.`,
  instructions: [
    'Use "query" for general text search across contact fields.',
    'Set "unclaimed" to true to retrieve only unclaimed leads.',
    'Use "emails" or "phones" for duplicate checking.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query string'),
      tag: z.string().optional().describe('Filter by tag name'),
      stage: z.string().optional().describe('Filter by stage name'),
      source: z.string().optional().describe('Filter by lead source'),
      assignedUserId: z.number().optional().describe('Filter by assigned user ID'),
      lastActivityAfter: z
        .string()
        .optional()
        .describe('Filter contacts with activity after this date (ISO 8601)'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter contacts created after this date (ISO 8601)'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter contacts updated after this date (ISO 8601)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (e.g., "created", "-created" for descending)'),
      unclaimed: z.boolean().optional().describe('Set to true to retrieve unclaimed leads'),
      emails: z
        .array(z.string())
        .optional()
        .describe('Email addresses for duplicate checking'),
      phones: z.array(z.string()).optional().describe('Phone numbers for duplicate checking'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (default 25, max 100)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      contacts: z.array(
        z.object({
          personId: z.number(),
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          stage: z.string().optional(),
          source: z.string().optional(),
          emails: z.array(z.any()).optional(),
          phones: z.array(z.any()).optional(),
          tags: z.array(z.string()).optional(),
          assignedTo: z.number().optional(),
          created: z.string().optional(),
          updated: z.string().optional()
        })
      ),
      total: z.number().optional(),
      isDuplicate: z
        .boolean()
        .optional()
        .describe('Whether a duplicate was found (only for duplicate checks)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.emails || ctx.input.phones) {
      let result = await client.checkDuplicate({
        emails: ctx.input.emails,
        phones: ctx.input.phones
      });

      let people = result.people || [];
      return {
        output: {
          contacts: people.map((p: any) => ({
            personId: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            stage: p.stage,
            source: p.source,
            emails: p.emails,
            phones: p.phones,
            tags: p.tags,
            assignedTo: p.assignedTo,
            created: p.created,
            updated: p.updated
          })),
          total: people.length,
          isDuplicate: people.length > 0
        },
        message:
          people.length > 0
            ? `Found **${people.length}** matching contact(s).`
            : 'No duplicates found.'
      };
    }

    if (ctx.input.unclaimed) {
      let result = await client.getUnclaimedPeople({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let people = result.people || [];
      return {
        output: {
          contacts: people.map((p: any) => ({
            personId: p.id,
            firstName: p.firstName,
            lastName: p.lastName,
            stage: p.stage,
            source: p.source,
            emails: p.emails,
            phones: p.phones,
            tags: p.tags,
            assignedTo: p.assignedTo,
            created: p.created,
            updated: p.updated
          })),
          total: result._metadata?.total
        },
        message: `Found **${people.length}** unclaimed lead(s).`
      };
    }

    let params: Record<string, any> = {};
    if (ctx.input.query) params.query = ctx.input.query;
    if (ctx.input.tag) params.tag = ctx.input.tag;
    if (ctx.input.stage) params.stage = ctx.input.stage;
    if (ctx.input.source) params.source = ctx.input.source;
    if (ctx.input.assignedUserId) params.assignedUserId = ctx.input.assignedUserId;
    if (ctx.input.lastActivityAfter) params.lastActivityAfter = ctx.input.lastActivityAfter;
    if (ctx.input.createdAfter) params.createdAfter = ctx.input.createdAfter;
    if (ctx.input.updatedAfter) params.updatedAfter = ctx.input.updatedAfter;
    if (ctx.input.sort) params.sort = ctx.input.sort;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;

    let result = await client.listPeople(params);
    let people = result.people || [];

    return {
      output: {
        contacts: people.map((p: any) => ({
          personId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          stage: p.stage,
          source: p.source,
          emails: p.emails,
          phones: p.phones,
          tags: p.tags,
          assignedTo: p.assignedTo,
          created: p.created,
          updated: p.updated
        })),
        total: result._metadata?.total
      },
      message: `Found **${people.length}** contact(s)${result._metadata?.total ? ` of ${result._metadata.total} total` : ''}.`
    };
  })
  .build();
