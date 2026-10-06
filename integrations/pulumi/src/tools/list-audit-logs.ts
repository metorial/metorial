import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
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
      organization: organizationInput,
      startTime: z
        .number()
        .describe('Unix timestamp in seconds — return events newer than this time'),
      endTime: z
        .number()
        .optional()
        .describe('End time in Unix seconds, at or after startTime'),
      eventFilter: z.string().optional().describe('Provider audit event-type filter'),
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
      continuationToken: z.string().optional(),
      returnedCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let result = await client.listAuditLogs(org, {
      startTime: ctx.input.startTime,
      userFilter: ctx.input.userFilter,
      continuationToken: ctx.input.continuationToken,
      endTime: ctx.input.endTime,
      eventFilter: ctx.input.eventFilter
    });

    let events = result.auditLogEvents.map(e => ({
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
        continuationToken: result.continuationToken,
        returnedCount: events.length
      },
      message: `Retrieved **${events.length}** audit log event(s) for organization **${org}**${result.continuationToken ? ' (more available)' : ''}`
    };
  })
  .build();
