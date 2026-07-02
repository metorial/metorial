import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let auditLogEntrySchema = z.object({
  id: z.string().describe('Audit log entry ID'),
  action: z.string().describe('The action that was performed'),
  entityType: z.string().describe('The type of entity the action was performed on'),
  entityID: z.string().optional().describe('The ID of the affected entity'),
  authorType: z
    .string()
    .optional()
    .describe('The type of the author who performed the action'),
  authorID: z.string().optional().describe('The ID of the author who performed the action'),
  changes: z.any().optional().describe('Details of the changes made'),
  createdAt: z.string().describe('Timestamp when the action occurred')
});

export let queryAuditLog = SlateTool.create(spec, {
  name: 'Query Audit Log',
  key: 'query_audit_log',
  description: `Query the HelpDesk audit log to retrieve a history of actions performed in the account. Supports filtering by action type, entity type, author, and date range with pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .optional()
        .describe('Filter by action type'),
      entityType: z
        .string()
        .optional()
        .describe('Filter by entity type (e.g., ticket, agent, team)'),
      authorType: z.string().optional().describe('Filter by author type'),
      authorID: z.string().optional().describe('Filter by author ID'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter entries created on or after this ISO 8601 date'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter entries created on or before this ISO 8601 date'),
      limit: z.number().optional().describe('Maximum number of entries to return'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching the next page of results')
    })
  )
  .output(
    z.object({
      entries: z.array(auditLogEntrySchema).describe('List of audit log entries'),
      pagination: z
        .object({
          after: z.string().optional().describe('Cursor for the next page'),
          before: z.string().optional().describe('Cursor for the previous page'),
          hasMore: z.boolean().optional().describe('Whether more results are available')
        })
        .optional()
        .describe('Pagination information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.queryAuditLog({
      action: ctx.input.action,
      entityType: ctx.input.entityType,
      authorType: ctx.input.authorType,
      authorID: ctx.input.authorID,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo,
      limit: ctx.input.limit,
      pageAfter: ctx.input.cursor
    });

    let entries = (result.data || []).map(entry => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityID: entry.entityID,
      authorType: entry.authorType,
      authorID: entry.authorID,
      changes: entry.changes,
      createdAt: entry.createdAt
    }));

    return {
      output: {
        entries,
        pagination: result.pagination
      },
      message: `Found **${entries.length}** audit log entries.`
    };
  })
  .build();
