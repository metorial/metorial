import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let checkSchema = z.object({
  checkId: z.number().describe('Unique check identifier'),
  name: z.string().describe('Check name'),
  hostname: z.string().optional().describe('Target hostname'),
  status: z
    .string()
    .optional()
    .describe('Current check status (up, down, unconfirmed_down, unknown, paused)'),
  type: z
    .string()
    .optional()
    .describe('Check type (http, httpcustom, tcp, ping, dns, udp, smtp, pop3, imap)'),
  resolution: z.number().optional().describe('Check interval in minutes'),
  lastErrorTime: z.number().optional().describe('Last error timestamp (Unix)'),
  lastTestTime: z.number().optional().describe('Last test timestamp (Unix)'),
  lastResponseTime: z.number().optional().describe('Last response time in ms'),
  created: z.number().optional().describe('Creation timestamp (Unix)'),
  tags: z
    .array(
      z.object({
        name: z.string(),
        type: z.string().optional(),
        count: z.any().optional()
      })
    )
    .optional()
    .describe('Tags attached to the check')
});

export let listChecks = SlateTool.create(spec, {
  name: 'List Uptime Checks',
  key: 'list_checks',
  description: `Lists all configured uptime checks in your Pingdom account. Returns check names, statuses, types, hostnames, and basic performance data. Supports filtering by tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tags: z.string().optional().describe('Comma-separated list of tags to filter checks by'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of checks to return (default 25000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      checks: z.array(checkSchema).describe('List of uptime checks'),
      counts: z
        .object({
          total: z.number(),
          filtered: z.number()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listChecks({
      tags: ctx.input.tags,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      include_tags: true,
      include_severity: true
    });

    let checks = (result.checks || []).map((c: any) => ({
      checkId: c.id,
      name: c.name,
      hostname: c.hostname,
      status: c.status,
      type: c.type,
      resolution: c.resolution,
      lastErrorTime: c.lasterrortime,
      lastTestTime: c.lasttesttime,
      lastResponseTime: c.lastresponsetime,
      created: c.created,
      tags: c.tags
    }));

    return {
      output: {
        checks,
        counts: result.counts
          ? {
              total: result.counts.total,
              filtered: result.counts.filtered
            }
          : undefined
      },
      message: `Found **${checks.length}** uptime check(s).`
    };
  })
  .build();
