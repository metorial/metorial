import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
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
      ...pageInput,
      projectId: z.string().describe('Project ID'),
      perPage: z
        .number()
        .optional()
        .describe('Results per page when listing pivot values (1 to 100)'),
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
      ...pageOutput,
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
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    if (ctx.input.pivotField) {
      let values = await client.getPivotValues(projectId, ctx.input.pivotField, ctx.input);
      let pivotValues = values.map(v => ({
        name: v.event_field_value ?? undefined,
        eventsCount: v.events ?? undefined,
        proportion: v.proportion ?? undefined
      }));

      return {
        output: { pivotValues, ...client.pageInfo },
        message: `Found **${pivotValues.length}** values for pivot **${ctx.input.pivotField}**.`
      };
    }

    let pivots = await client.listProjectPivots(projectId);
    let mapped = pivots.map(p => ({
      displayId: p.event_field_display_id ?? undefined,
      name: p.name ?? undefined
    }));

    return {
      output: { pivots: mapped },
      message: `Found **${mapped.length}** available pivot dimensions.`
    };
  })
  .build();
