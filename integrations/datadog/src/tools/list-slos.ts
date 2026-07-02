import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listSlos = SlateTool.create(spec, {
  name: 'List SLOs',
  key: 'list_slos',
  description: `List Datadog Service Level Objectives. Filter SLOs by query, tags, or specific IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter SLOs by name'),
      tagsQuery: z.string().optional().describe('Filter SLOs by tags, e.g. "env:production"'),
      ids: z.string().optional().describe('Comma-separated SLO IDs to retrieve specific SLOs'),
      limit: z.number().optional().describe('Maximum number of SLOs to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      slos: z
        .array(
          z.object({
            sloId: z.string(),
            name: z.string(),
            type: z.string(),
            description: z.string().optional(),
            tags: z.array(z.string()).optional(),
            thresholds: z
              .array(
                z.object({
                  timeframe: z.string(),
                  target: z.number(),
                  warning: z.number().optional()
                })
              )
              .optional(),
            createdAt: z.number().optional(),
            modifiedAt: z.number().optional()
          })
        )
        .describe('List of SLOs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let result = await client.listSLOs(ctx.input);

    let slos = (result.data || []).map((slo: any) => ({
      sloId: slo.id,
      name: slo.name,
      type: slo.type,
      description: slo.description,
      tags: slo.tags,
      thresholds: (slo.thresholds || []).map((t: any) => ({
        timeframe: t.timeframe,
        target: t.target,
        warning: t.warning
      })),
      createdAt: slo.created_at,
      modifiedAt: slo.modified_at
    }));

    return {
      output: { slos },
      message: `Found **${slos.length}** SLOs`
    };
  })
  .build();
