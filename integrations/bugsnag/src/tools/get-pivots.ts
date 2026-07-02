import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

let pivotValueSchema = z.object({
  name: z.string().optional().describe('Pivot value name (e.g., browser name, OS version)'),
  eventsCount: z.number().optional().describe('Number of events for this pivot value'),
  proportion: z.number().optional().describe('Proportion of total events')
});

export let getPivots = SlateTool.create(spec, {
  name: 'Get Error Pivots',
  key: 'get_pivots',
  description: `Analyze error distributions by breaking down errors by dimensions such as device, browser, OS, or custom fields. Returns available pivot dimensions and their value distributions. Useful for identifying which platforms, browsers, or user segments are most affected.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID'),
      pivotField: z
        .string()
        .optional()
        .describe(
          'Specific pivot field to get values for (e.g., device.browser, device.os_name). Omit to list all available pivots.'
        )
    })
  )
  .output(
    z.object({
      pivots: z
        .array(
          z.object({
            displayId: z.string().optional().describe('Pivot display identifier'),
            name: z.string().optional().describe('Pivot name')
          })
        )
        .optional()
        .describe('Available pivot dimensions (when no pivotField specified)'),
      pivotValues: z
        .array(pivotValueSchema)
        .optional()
        .describe('Pivot value distribution (when pivotField specified)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    if (ctx.input.pivotField) {
      let values = await client.getPivotValues(projectId, ctx.input.pivotField);
      let pivotValues = (Array.isArray(values) ? values : []).map((v: any) => ({
        name: v.name || v.value,
        eventsCount: v.events_count ?? v.events,
        proportion: v.proportion
      }));

      return {
        output: { pivotValues },
        message: `Found **${pivotValues.length}** values for pivot **${ctx.input.pivotField}**.`
      };
    }

    let pivots = await client.listProjectPivots(projectId);
    let mapped = (Array.isArray(pivots) ? pivots : []).map((p: any) => ({
      displayId: p.display_id,
      name: p.name
    }));

    return {
      output: { pivots: mapped },
      message: `Found **${mapped.length}** available pivot dimensions.`
    };
  })
  .build();
