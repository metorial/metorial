import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { requireProjectRef } from '../lib/errors';
import { spec } from '../spec';

export let getProjectLogs = SlateTool.create(spec, {
  name: 'Get Project Logs',
  key: 'get_project_logs',
  description: `Query Supabase project logs through the Management API. Use a custom logs SQL query for specific sources, or omit SQL to retrieve the default recent Edge Logs window.`,
  instructions: [
    'When startTimestamp and endTimestamp are provided, the range must be no more than 24 hours.',
    'Timestamps should be ISO 8601 strings.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectRef: z
        .string()
        .optional()
        .describe('Project reference ID (uses config.projectRef if not provided)'),
      sql: z
        .string()
        .optional()
        .describe('Custom log SQL query. Omit to query the default recent edge_logs window.'),
      startTimestamp: z
        .string()
        .optional()
        .describe('Inclusive ISO timestamp start for the log query'),
      endTimestamp: z
        .string()
        .optional()
        .describe('Exclusive ISO timestamp end for the log query')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Supabase logs query response')
    })
  )
  .handleInvocation(async ctx => {
    let projectRef = requireProjectRef(ctx.input.projectRef ?? ctx.config.projectRef);
    let client = new ManagementClient(ctx.auth.token);
    let result = await client.getProjectLogs(projectRef, {
      sql: ctx.input.sql,
      startTimestamp: ctx.input.startTimestamp,
      endTimestamp: ctx.input.endTimestamp
    });

    return {
      output: {
        result
      },
      message: `Retrieved logs for project **${projectRef}**.`
    };
  })
  .build();
