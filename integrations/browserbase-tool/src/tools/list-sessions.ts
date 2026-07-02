import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `List browser sessions with optional filtering by status or user metadata query. Returns session details including status, region, timing, and proxy usage.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['PENDING', 'RUNNING', 'ERROR', 'TIMED_OUT', 'COMPLETED'])
        .optional()
        .describe('Filter sessions by status'),
      query: z.string().optional().describe('Search sessions by user metadata')
    })
  )
  .output(
    z.object({
      sessions: z.array(
        z.object({
          sessionId: z.string().describe('Session identifier'),
          status: z.string().describe('Session status'),
          region: z.string().describe('Session region'),
          createdAt: z.string().describe('Creation timestamp'),
          startedAt: z.string().describe('Start timestamp'),
          endedAt: z.string().nullable().describe('End timestamp if completed'),
          keepAlive: z.boolean().describe('Whether keep-alive is enabled'),
          proxyBytes: z.number().describe('Bytes consumed via proxy'),
          contextId: z.string().nullable().describe('Linked context ID'),
          userMetadata: z.record(z.string(), z.string()).nullable().describe('Custom metadata')
        })
      ),
      totalCount: z.number().describe('Total number of sessions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let sessions = await client.listSessions({
      status: ctx.input.status,
      query: ctx.input.query
    });

    return {
      output: {
        sessions: sessions.map(s => ({
          sessionId: s.sessionId,
          status: s.status,
          region: s.region,
          createdAt: s.createdAt,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          keepAlive: s.keepAlive,
          proxyBytes: s.proxyBytes,
          contextId: s.contextId,
          userMetadata: s.userMetadata
        })),
        totalCount: sessions.length
      },
      message: `Found **${sessions.length}** session(s)${ctx.input.status ? ` with status **${ctx.input.status}**` : ''}.`
    };
  })
  .build();
