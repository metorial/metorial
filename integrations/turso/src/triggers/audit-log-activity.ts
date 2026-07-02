import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let auditLogActivity = SlateTrigger.create(spec, {
  name: 'Audit Log Activity',
  key: 'audit_log_activity',
  description:
    'Polls for new audit log entries in the organization. Triggers whenever new activity is detected, such as database creation, member changes, or token operations.'
})
  .input(
    z.object({
      code: z.string().describe('Audit log event code'),
      message: z.string().describe('Description of the action'),
      origin: z.string().describe('Origin of the action'),
      author: z.string().describe('Who performed the action'),
      createdAt: z.string().describe('When the action occurred (ISO 8601)'),
      data: z.record(z.string(), z.unknown()).optional().describe('Additional event data')
    })
  )
  .output(
    z.object({
      code: z.string().describe('Audit log event code'),
      message: z.string().describe('Description of the action'),
      origin: z.string().describe('Origin of the action (e.g., "api", "cli")'),
      author: z.string().describe('Who performed the action'),
      createdAt: z.string().describe('When the action occurred (ISO 8601)'),
      data: z.record(z.string(), z.unknown()).optional().describe('Additional event data')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        organizationSlug: ctx.config.organizationSlug
      });

      let lastSeenAt = (ctx.state as Record<string, unknown>)?.lastSeenAt as
        | string
        | undefined;

      let result = await client.listAuditLogs({ page: 1, pageSize: 50 });
      let logs = result.audit_logs;

      let newLogs = lastSeenAt ? logs.filter(log => log.created_at > lastSeenAt) : logs;

      let updatedLastSeenAt =
        logs.length > 0
          ? logs.reduce(
              (max, log) => (log.created_at > max ? log.created_at : max),
              logs[0]!.created_at
            )
          : lastSeenAt;

      return {
        inputs: newLogs.map(log => ({
          code: log.code,
          message: log.message,
          origin: log.origin,
          author: log.author,
          createdAt: log.created_at,
          data: log.data
        })),
        updatedState: {
          lastSeenAt: updatedLastSeenAt
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `audit_log.${ctx.input.code}`,
        id: `${ctx.input.createdAt}-${ctx.input.code}-${ctx.input.author}`,
        output: {
          code: ctx.input.code,
          message: ctx.input.message,
          origin: ctx.input.origin,
          author: ctx.input.author,
          createdAt: ctx.input.createdAt,
          data: ctx.input.data
        }
      };
    }
  })
  .build();
