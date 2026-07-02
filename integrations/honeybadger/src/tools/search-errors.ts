import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
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
  assignee: z.any().optional().describe('User assigned to this error'),
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
      projectId: z.string().describe('Project ID to search errors in'),
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
      faults: z.array(faultSchema).describe('List of matching errors'),
      totalCount: z.number().optional().describe('Total number of matching faults')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let data = await client.listFaults(ctx.input.projectId, {
      q: ctx.input.query,
      createdAfter: ctx.input.createdAfter,
      occurredAfter: ctx.input.occurredAfter,
      occurredBefore: ctx.input.occurredBefore,
      limit: ctx.input.limit,
      order: ctx.input.order
    });

    let results = data.results || [];
    let faults = results.map((f: any) => ({
      faultId: f.id,
      projectId: f.project_id,
      klass: f.klass,
      message: f.message,
      component: f.component,
      action: f.action,
      environment: f.environment,
      resolved: f.resolved,
      ignored: f.ignored,
      noticesCount: f.notices_count,
      createdAt: f.created_at,
      lastNoticeAt: f.last_notice_at,
      tags: f.tags,
      assignee: f.assignee,
      url: f.url
    }));

    return {
      output: {
        faults,
        totalCount: data.total_count
      },
      message: `Found **${faults.length}** error(s) in project ${ctx.input.projectId}.`
    };
  })
  .build();
