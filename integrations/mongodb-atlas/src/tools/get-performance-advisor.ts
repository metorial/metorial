import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPerformanceAdvisorTool = SlateTool.create(spec, {
  name: 'Get Performance Recommendations',
  key: 'get_performance_advisor',
  description: `Retrieve performance optimization recommendations from the Atlas Performance Advisor. Get suggested indexes and slow query logs for a specific MongoDB process to identify and resolve performance bottlenecks.`,
  instructions: [
    'You need a process ID (hostname:port) — use the "Get Cluster Metrics" tool with action "list_processes" to find one.',
    'The Performance Advisor requires dedicated clusters (M10+).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      processId: z.string().describe('Process ID in hostname:port format'),
      action: z.enum(['suggested_indexes', 'slow_queries']).describe('What to retrieve'),
      namespaces: z
        .string()
        .optional()
        .describe('Comma-separated list of namespaces to filter (e.g., "db.collection")'),
      durationMs: z
        .number()
        .optional()
        .describe('Duration in milliseconds to analyze (default: last 24 hours)'),
      since: z.number().optional().describe('Unix timestamp to start analysis from'),
      maxResults: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      suggestedIndexes: z
        .array(
          z.object({
            namespace: z.string().optional(),
            index: z.array(z.any()).optional(),
            weight: z.number().optional(),
            impact: z.array(z.string()).optional()
          })
        )
        .optional(),
      slowQueries: z
        .array(
          z.object({
            namespace: z.string().optional(),
            line: z.string().optional(),
            count: z.number().optional()
          })
        )
        .optional(),
      shapes: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required. Provide it in input or config.');

    let { action, processId } = ctx.input;

    if (action === 'suggested_indexes') {
      let result = await client.listSuggestedIndexes(projectId, processId, {
        namespaces: ctx.input.namespaces,
        duration: ctx.input.durationMs,
        since: ctx.input.since,
        nIndexes: ctx.input.maxResults
      });

      let suggestedIndexes = (result.suggestedIndexes || []).map((idx: any) => ({
        namespace: idx.namespace,
        index: idx.index,
        weight: idx.weight,
        impact: idx.impact
      }));

      return {
        output: { suggestedIndexes, shapes: result.shapes },
        message: `Found **${suggestedIndexes.length}** suggested index(es) for process **${processId}**.`
      };
    }

    if (action === 'slow_queries') {
      let result = await client.listSlowQueries(projectId, processId, {
        namespaces: ctx.input.namespaces,
        duration: ctx.input.durationMs,
        since: ctx.input.since,
        nLogs: ctx.input.maxResults
      });

      let slowQueries = (result.slowQueries || []).map((q: any) => ({
        namespace: q.namespace,
        line: q.line,
        count: q.count
      }));

      return {
        output: { slowQueries },
        message: `Found **${slowQueries.length}** slow query pattern(s) for process **${processId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
