import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAuditLogs = SlateTool.create(spec, {
  name: 'List Audit Logs',
  key: 'list_audit_logs',
  description: `Retrieve audit log events for a Pulumi organization. Shows user activity including stack operations, deployments, and access changes. Available for Enterprise and Business Critical editions.`,
  constraints: ['Requires Enterprise or Business Critical edition.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      startTime: z.number().describe('Unix timestamp — return events newer than this time'),
      userFilter: z.string().optional().describe('Filter events by username'),
      continuationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          timestamp: z.number().optional(),
          sourceIP: z.string().optional(),
          event: z.string().optional(),
          description: z.string().optional(),
          userName: z.string().optional(),
          userLogin: z.string().optional()
        })
      ),
      continuationToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let result = await client.listAuditLogs(org, {
      startTime: ctx.input.startTime,
      userFilter: ctx.input.userFilter,
      continuationToken: ctx.input.continuationToken
    });

    let events = (result.auditLogEvents || []).map((e: any) => ({
      timestamp: e.timestamp,
      sourceIP: e.sourceIP,
      event: e.event,
      description: e.description,
      userName: e.user?.name,
      userLogin: e.user?.githubLogin
    }));

    return {
      output: {
        events,
        continuationToken: result.continuationToken
      },
      message: `Retrieved **${events.length}** audit log event(s) for organization **${org}**${result.continuationToken ? ' (more available)' : ''}`
    };
  })
  .build();
