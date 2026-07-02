import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCases = SlateTool.create(spec, {
  name: 'List Cases',
  key: 'list_cases',
  description: `Search and retrieve cases from a CommCare project. Cases are the core longitudinal data records that track ongoing interactions (e.g., patients, households).
Supports filtering by case type, owner, modification date, status, and more. Returns paginated results with case properties and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      caseType: z
        .string()
        .optional()
        .describe('Filter by case type (e.g., "patient", "household")'),
      ownerId: z.string().optional().describe('Filter by the owner ID of the case'),
      closed: z
        .boolean()
        .optional()
        .describe('Filter by open (false) or closed (true) status'),
      dateModifiedStart: z
        .string()
        .optional()
        .describe('Filter cases modified on or after this date (ISO 8601 format)'),
      dateModifiedEnd: z
        .string()
        .optional()
        .describe('Filter cases modified on or before this date (ISO 8601 format)'),
      serverDateModifiedStart: z
        .string()
        .optional()
        .describe('Filter by server-side modification date start (ISO 8601)'),
      serverDateModifiedEnd: z
        .string()
        .optional()
        .describe('Filter by server-side modification date end (ISO 8601)'),
      externalId: z.string().optional().describe('Filter by external ID'),
      caseName: z.string().optional().describe('Filter by case name'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      cases: z.array(
        z.object({
          caseId: z.string(),
          caseType: z.string(),
          caseName: z.string().optional(),
          closed: z.boolean(),
          ownerId: z.string(),
          dateOpened: z.string(),
          dateModified: z.string(),
          dateClosed: z.string().nullable(),
          properties: z.record(z.string(), z.any()),
          indices: z.record(z.string(), z.any()),
          userId: z.string()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listCases({
      caseType: ctx.input.caseType,
      ownerId: ctx.input.ownerId,
      closed: ctx.input.closed,
      dateModifiedStart: ctx.input.dateModifiedStart,
      dateModifiedEnd: ctx.input.dateModifiedEnd,
      serverDateModifiedStart: ctx.input.serverDateModifiedStart,
      serverDateModifiedEnd: ctx.input.serverDateModifiedEnd,
      externalId: ctx.input.externalId,
      caseName: ctx.input.caseName,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let cases = result.objects.map(c => ({
      caseId: c.case_id,
      caseType: c.case_type,
      caseName: c.properties?.case_name,
      closed: c.closed,
      ownerId: c.owner_id,
      dateOpened: c.date_opened,
      dateModified: c.date_modified,
      dateClosed: c.date_closed,
      properties: c.properties,
      indices: c.indices,
      userId: c.user_id
    }));

    return {
      output: {
        cases,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** cases${ctx.input.caseType ? ` of type "${ctx.input.caseType}"` : ''}. Returned ${cases.length} results.`
    };
  })
  .build();
