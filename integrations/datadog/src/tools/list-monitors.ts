import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMonitors = SlateTool.create(spec, {
  name: 'List Monitors',
  key: 'list_monitors',
  description: `List and search Datadog monitors. Retrieve monitors filtered by name, tags, or state. Returns monitor details including current alert state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter monitors by name (substring match)'),
      tags: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of tags to filter by, e.g. "env:production,service:web"'
        ),
      monitorTags: z
        .string()
        .optional()
        .describe('Comma-separated list of monitor tags to filter by'),
      groupStates: z
        .string()
        .optional()
        .describe(
          'Comma-separated group states to include: "all", "alert", "warn", "no data"'
        ),
      page: z.number().optional().describe('Page number for pagination (0-indexed)'),
      pageSize: z.number().optional().describe('Number of monitors per page (max 1000)')
    })
  )
  .output(
    z.object({
      monitors: z
        .array(
          z.object({
            monitorId: z.number(),
            name: z.string(),
            type: z.string(),
            query: z.string(),
            overallState: z.string().optional(),
            message: z.string().optional(),
            tags: z.array(z.string()).optional(),
            priority: z.number().optional(),
            created: z.string().optional(),
            modified: z.string().optional(),
            creatorName: z.string().optional()
          })
        )
        .describe('List of monitors matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let monitors = await client.listMonitors(ctx.input);

    let mapped = monitors.map((m: any) => ({
      monitorId: m.id,
      name: m.name,
      type: m.type,
      query: m.query,
      overallState: m.overall_state,
      message: m.message,
      tags: m.tags,
      priority: m.priority,
      created: m.created,
      modified: m.modified,
      creatorName: m.creator?.name
    }));

    return {
      output: { monitors: mapped },
      message: `Found **${mapped.length}** monitors`
    };
  })
  .build();
