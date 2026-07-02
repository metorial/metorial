import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let stepSchema = z.object({
  action: z.any().describe('Action identifier or expanded action object'),
  authentication: z
    .any()
    .nullable()
    .describe('Authentication identifier or expanded authentication object'),
  inputs: z.record(z.string(), z.any()).nullable().describe('Step input field values'),
  title: z.string().nullable().describe('Step title')
});

export let listZaps = SlateTool.create(spec, {
  name: 'List Zaps',
  key: 'list_zaps',
  description: `Retrieve a list of Zaps for the authenticated Zapier user. Returns Zap details including enabled/disabled status, last successful run date, step details, and editor links.
Use the **expand** parameter to include full action and authentication objects instead of just IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expand: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to expand to full objects, e.g. "steps.action"'
        ),
      includeShared: z
        .boolean()
        .optional()
        .describe('Include shared Zaps (requires zap:account:all scope)'),
      inputs: z
        .record(z.string(), z.string())
        .optional()
        .describe('Filter Zaps by specific input settings, e.g. { "board": "BOARD_ID" }'),
      limit: z.number().optional().describe('Maximum number of Zaps to return (default: 10)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      zaps: z.array(
        z.object({
          zapId: z.string().describe('Unique identifier for the Zap'),
          title: z.string().describe('Zap title'),
          isEnabled: z.boolean().describe('Whether the Zap is currently turned on'),
          lastSuccessfulRunDate: z
            .string()
            .nullable()
            .describe('ISO 8601 timestamp of the last successful execution'),
          updatedAt: z.string().describe('ISO 8601 timestamp of last update'),
          editorUrl: z.string().describe('URL to edit the Zap in Zapier'),
          steps: z.array(stepSchema).describe('Workflow steps in this Zap')
        })
      ),
      totalCount: z.number().describe('Total number of matching Zaps')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getZaps({
      expand: ctx.input.expand,
      includeShared: ctx.input.includeShared,
      inputs: ctx.input.inputs,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let zaps = response.data.map(zap => ({
      zapId: zap.id,
      title: zap.title,
      isEnabled: zap.isEnabled,
      lastSuccessfulRunDate: zap.lastSuccessfulRunDate,
      updatedAt: zap.updatedAt,
      editorUrl: zap.links?.htmlEditor || '',
      steps: zap.steps || []
    }));

    let enabledCount = zaps.filter(z => z.isEnabled).length;

    return {
      output: {
        zaps,
        totalCount: response.meta.count
      },
      message: `Found **${response.meta.count}** Zap(s). Returned ${zaps.length} result(s) — ${enabledCount} enabled, ${zaps.length - enabledCount} disabled.`
    };
  })
  .build();
