import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSessions = SlateTool.create(spec, {
  name: 'List Sessions',
  key: 'list_sessions',
  description: `Retrieve a paginated list of browser sessions with optional filtering by status, tags, domains, and date range. Returns session metadata including status, duration, credits used, and proxy information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      limit: z.number().optional().describe('Results per page (10, 20, or 50)'),
      sortBy: z.string().optional().describe('Field to sort by (default: created_at)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      search: z.string().optional().describe('Search text to filter sessions'),
      status: z.string().optional().describe('Filter by session status'),
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
      sessions: z.array(
        z.object({
          sessionId: z.string(),
          status: z.string(),
          tags: z.array(z.string()),
          headless: z.boolean(),
          recording: z.boolean(),
          usedCredits: z.number(),
          proxyBytes: z.number(),
          proxyType: z.string(),
          steps: z.number(),
          duration: z.number(),
          createdAt: z.string(),
          domains: z.array(z.string()),
          taskInitiated: z.boolean()
        })
      ),
      total: z.number(),
      page: z.number(),
      totalPages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    let result = await client.listSessions({
      page: input.page,
      limit: input.limit,
      sort_by: input.sortBy,
      sort_order: input.sortOrder,
      search: input.search,
      status: input.status,
      tags: input.tags,
      domains: input.domains,
      created_from: input.createdFrom,
      created_to: input.createdTo
    });

    return {
      output: {
        sessions: (result.sessions ?? []).map(s => ({
          sessionId: s.id,
          status: s.status,
          tags: s.tags ?? [],
          headless: s.headless ?? false,
          recording: s.recording ?? false,
          usedCredits: s.used_credits ?? 0,
          proxyBytes: s.proxy_bytes ?? 0,
          proxyType: s.proxy_type ?? '',
          steps: s.steps ?? 0,
          duration: s.duration ?? 0,
          createdAt: s.created_at ?? '',
          domains: s.domains ?? [],
          taskInitiated: s.task_initiated ?? false
        })),
        total: result.total ?? 0,
        page: result.page ?? 1,
        totalPages: result.total_pages ?? 0
      },
      message: `Found **${result.total ?? 0}** sessions (page ${result.page ?? 1} of ${result.total_pages ?? 0}).`
    };
  })
  .build();
