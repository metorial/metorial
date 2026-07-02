import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActiveSessions = SlateTool.create(spec, {
  name: 'Get Active Sessions',
  key: 'get_active_sessions',
  description: `Retrieve the status of all currently active browser sessions. Returns a lightweight summary with count and individual session statuses, tags, and creation timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tags: z.string().optional().describe('Filter by tags (comma-separated)'),
      domains: z.string().optional().describe('Filter by domains (comma-separated)'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter sessions created after this ISO date'),
      createdTo: z.string().optional().describe('Filter sessions created before this ISO date')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Total number of active sessions'),
      sessions: z.array(
        z.object({
          sessionId: z.string(),
          status: z.string(),
          tags: z.array(z.string()),
          createdAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getActiveSessionStatuses({
      tags: ctx.input.tags,
      domains: ctx.input.domains,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo
    });

    return {
      output: {
        count: result.count,
        sessions: (result.items ?? []).map(s => ({
          sessionId: s.session_id,
          status: s.status,
          tags: s.tags ?? [],
          createdAt: s.created_at
        }))
      },
      message: `**${result.count}** active sessions found.`
    };
  })
  .build();
