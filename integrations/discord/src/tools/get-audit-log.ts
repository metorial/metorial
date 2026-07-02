import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let auditLogEntrySchema = z.object({
  entryId: z.string().describe('The ID of the audit log entry'),
  userId: z.string().describe('The ID of the user who performed the action'),
  targetId: z
    .string()
    .nullable()
    .describe('The ID of the target entity affected by the action'),
  actionType: z.number().describe('The type of audit log action that occurred'),
  changes: z.array(z.any()).describe('Array of changes made to the target'),
  reason: z.string().optional().describe('The reason provided for the action')
});

export let getAuditLogTool = SlateTool.create(spec, {
  name: 'Get Audit Log',
  key: 'get_audit_log',
  description: `Fetch audit log entries for a Discord guild. Supports filtering by user, action type, and pagination via snowflake IDs.`,
  instructions: [
    'Provide a **guildId** to fetch audit log entries for that guild.',
    'Optionally filter results by **userId** to see only actions performed by a specific user.',
    'Optionally filter by **actionType** (integer) to see only a specific type of action (e.g. 1 = guild update, 20 = channel create, 22 = channel delete, 24 = member update, 25 = member role update, 26 = member move, 72 = message delete).',
    'Use **before** with a snowflake ID to paginate backwards through entries.',
    'The **limit** parameter controls how many entries are returned (default 50, max 100).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(discordActionScopes.getAuditLog)
  .input(
    z.object({
      guildId: z.string().describe('The ID of the guild to fetch audit logs for'),
      userId: z
        .string()
        .optional()
        .describe('Filter audit log entries by the user who performed the action'),
      actionType: z
        .number()
        .optional()
        .describe('Filter audit log entries by action type (integer)'),
      before: z
        .string()
        .optional()
        .describe('Snowflake ID to paginate; returns entries before this ID'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of audit log entries to return (1-100, default 50)')
    })
  )
  .output(
    z.object({
      auditLogEntries: z.array(auditLogEntrySchema).describe('Array of audit log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

    let auditLog = await client.getGuildAuditLog(ctx.input.guildId, {
      userId: ctx.input.userId,
      actionType: ctx.input.actionType,
      before: ctx.input.before,
      limit: ctx.input.limit ?? 50
    });

    let entries = (auditLog.audit_log_entries || []).map((entry: any) => ({
      entryId: entry.id ?? '',
      userId: entry.user_id ?? '',
      targetId: entry.target_id ?? null,
      actionType: entry.action_type ?? 0,
      changes: entry.changes ?? [],
      reason: entry.reason
    }));

    return {
      output: {
        auditLogEntries: entries
      },
      message: `Retrieved ${entries.length} audit log entry(ies) for guild \`${ctx.input.guildId}\`.`
    };
  })
  .build();
