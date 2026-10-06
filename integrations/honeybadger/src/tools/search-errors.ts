import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import type { Fault } from '../lib/types';
import { nextUrlSchema, projectIdSchema } from '../lib/validation';
import { spec } from '../spec';

let faultSchema = z.object({
  faultId: z.number().describe('Unique fault ID'),
  projectId: z.number().optional().describe('Project ID'),
  klass: z.string().optional().describe('Error class name'),
  message: z.string().optional().describe('Error message'),
  component: z.string().optional().describe('Component where the error occurred'),
  action: z.string().optional().describe('Action where the error occurred'),
  environment: z.string().optional().describe('Environment name'),
  resolved: z.boolean().optional().describe('Whether the error is resolved'),
  ignored: z.boolean().optional().describe('Whether the error is ignored'),
  noticesCount: z.number().optional().describe('Total number of occurrences'),
  createdAt: z.string().optional().describe('When the error was first seen'),
  lastNoticeAt: z.string().optional().describe('When the error last occurred'),
  tags: z.array(z.string()).optional().describe('Tags associated with the error'),
  assignee: z.unknown().optional().describe('User assigned to this error'),
  url: z.string().optional().describe('URL to view error in Honeybadger')
});

export let searchErrors = SlateTool.create(spec, {
  name: 'Search Errors',
  key: 'search_errors',
  description: `Search and list errors (faults) in a Honeybadger project. Supports filtering by search query, time range, and ordering. Use the search query to filter by class name, message, environment, component, action, or tags.`,
  instructions: [
    'Use the `query` field with Honeybadger search syntax, e.g. `-is:resolved -is:ignored environment:production`.',
    'Results are paginated with a maximum of 25 per request.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextUrl: nextUrlSchema,
      projectId: projectIdSchema,
      query: z
        .string()
        .optional()
        .describe(
          'Search query (e.g., "-is:resolved environment:production class:RuntimeError")'
        ),
      createdAfter: z
        .number()
        .optional()
        .describe('Filter errors created after this Unix timestamp'),
      occurredAfter: z
        .number()
        .optional()
        .describe('Filter errors that occurred after this Unix timestamp'),
      occurredBefore: z
        .number()
        .optional()
        .describe('Filter errors that occurred before this Unix timestamp'),
      limit: z.number().optional().describe('Max results to return (max 25)'),
      order: z.enum(['recent', 'frequent']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      nextUrl: z
        .string()
        .optional()
        .describe('Next-page URL, when another page may be available'),
      faults: z.array(faultSchema).describe('List of matching errors'),
      totalCount: z.number().optional().describe('Total number of matching faults')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient(ctx.auth);
    let data = await client.listFaults(ctx.input.projectId, {
      q: ctx.input.query,
      nextUrl: ctx.input.nextUrl,
      createdAfter: ctx.input.createdAfter,
      occurredAfter: ctx.input.occurredAfter,
      occurredBefore: ctx.input.occurredBefore,
      limit: ctx.input.limit,
      order: ctx.input.order
    });

    let results = data.results || [];
    let faults = results.map((f: Fault) => ({
      faultId: f.id ?? undefined,
      projectId: f.project_id ?? undefined,
      klass: f.klass ?? undefined,
      message: f.message ?? undefined,
      component: f.component ?? undefined,
      action: f.action ?? undefined,
      environment: f.environment ?? undefined,
      resolved: f.resolved ?? undefined,
      ignored: f.ignored ?? undefined,
      noticesCount: f.notices_count ?? undefined,
      createdAt: f.created_at ?? undefined,
      lastNoticeAt: f.last_notice_at ?? undefined,
      tags: f.tags ?? undefined,
      assignee: f.assignee ?? undefined,
      url: f.url ?? undefined
    }));

    return {
      output: {
        faults,
        nextUrl: data.links?.next ?? undefined,
        totalCount: data.total_count
      },
      message: `Found **${faults.length}** error(s) in project ${ctx.input.projectId}.`
    };
  })
  .build();
