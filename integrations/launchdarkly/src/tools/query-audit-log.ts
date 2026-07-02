import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let queryAuditLog = SlateTool.create(spec, {
  name: 'Query Audit Log',
  key: 'query_audit_log',
  description: `Search the LaunchDarkly audit log for change history entries. Query by date range, full-text search, or resource specifier. Useful for compliance, debugging, and tracking who changed what and when.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Full-text search query across audit log entries'),
      after: z
        .number()
        .optional()
        .describe('Unix timestamp (ms) to filter entries after this time'),
      before: z
        .number()
        .optional()
        .describe('Unix timestamp (ms) to filter entries before this time'),
      resourceSpec: z
        .string()
        .optional()
        .describe(
          'Resource specifier to filter entries (e.g., "proj/my-project:env/production:flag/my-flag")'
        ),
      limit: z.number().optional().describe('Maximum number of entries to return (default 20)')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          auditLogEntryId: z.string().describe('Audit log entry ID'),
          date: z.string().describe('Timestamp of the change (ms since epoch)'),
          kind: z.string().describe('Resource kind (e.g., "flag", "project", "environment")'),
          name: z.string().describe('Name of the changed resource'),
          description: z.string().describe('Human-readable description of the change'),
          shortDescription: z.string().describe('Short summary of the change'),
          memberEmail: z
            .string()
            .optional()
            .describe('Email of the member who made the change'),
          memberName: z.string().optional().describe('Name of the member'),
          titleVerb: z
            .string()
            .optional()
            .describe('Action verb (e.g., "updated", "created")'),
          target: z
            .object({
              resourceKind: z.string().optional(),
              resourceName: z.string().optional()
            })
            .optional()
            .describe('Target resource of the change')
        })
      ),
      totalCount: z.number().optional().describe('Total matching entries (if available)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LaunchDarklyClient(ctx.auth.token);
    let result = await client.getAuditLogEntries({
      q: ctx.input.query,
      after: ctx.input.after,
      before: ctx.input.before,
      spec: ctx.input.resourceSpec,
      limit: ctx.input.limit
    });

    let items = result.items ?? [];
    let entries = items.map((entry: any) => ({
      auditLogEntryId: entry._id,
      date: String(entry.date),
      kind: entry.kind ?? '',
      name: entry.name ?? '',
      description: entry.description ?? '',
      shortDescription: entry.shortDescription ?? '',
      memberEmail: entry.member?.email,
      memberName: entry.member?.firstName
        ? `${entry.member.firstName} ${entry.member.lastName ?? ''}`.trim()
        : undefined,
      titleVerb: entry.titleVerb,
      target: entry.target
        ? {
            resourceKind: entry.target.resources?.[0]?.kind,
            resourceName: entry.target.resources?.[0]?.name
          }
        : undefined
    }));

    return {
      output: {
        entries,
        totalCount: result.totalCount
      },
      message: `Found **${entries.length}** audit log entries${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
