import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let enrichData = SlateTool.create(spec, {
  name: 'Enrich Data',
  key: 'enrich_data',
  description: `Enrich sheet data using built-in or custom enrichment providers. Built-in providers include email validation and geolocation. Custom HTTP enrichments allow calling external APIs to enrich data. Enrichments consume credits.`,
  instructions: [
    'Built-in enrichments (email, geo) operate on a specific column.',
    'Custom HTTP enrichments use the "custom_http" type and require additional configuration.',
    'Use list_tasks to monitor enrichment progress, and cancel_task to stop a running enrichment.'
  ],
  constraints: ['Enrichments consume credits from your Gigasheet account.']
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet to enrich'),
      action: z
        .enum([
          'email',
          'geo',
          'custom_http_apply',
          'custom_http_preview',
          'list_tasks',
          'task_status',
          'cancel_task'
        ])
        .describe('Enrichment action'),
      columnName: z
        .string()
        .optional()
        .describe('Column to enrich (for email, geo enrichments)'),
      enrichmentConfig: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Configuration for custom HTTP enrichment'),
      taskHandle: z.string().optional().describe('Task handle for task_status or cancel_task')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Enrichment operation result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: unknown;

    switch (ctx.input.action) {
      case 'email':
        if (!ctx.input.columnName)
          throw new Error('columnName is required for email enrichment');
        result = await client.enrichEmail(ctx.input.sheetHandle, ctx.input.columnName);
        break;

      case 'geo':
        if (!ctx.input.columnName)
          throw new Error('columnName is required for geo enrichment');
        result = await client.enrichGeo(ctx.input.sheetHandle, ctx.input.columnName);
        break;

      case 'custom_http_apply':
        if (!ctx.input.enrichmentConfig)
          throw new Error('enrichmentConfig is required for custom HTTP enrichment');
        result = await client.applyHttpEnrichment(
          ctx.input.sheetHandle,
          ctx.input.enrichmentConfig
        );
        break;

      case 'custom_http_preview':
        if (!ctx.input.enrichmentConfig)
          throw new Error('enrichmentConfig is required for custom HTTP preview');
        result = await client.previewHttpEnrichment(
          ctx.input.sheetHandle,
          ctx.input.enrichmentConfig
        );
        break;

      case 'list_tasks':
        result = await client.listEnrichmentTasks();
        break;

      case 'task_status':
        if (!ctx.input.taskHandle) throw new Error('taskHandle is required for task_status');
        result = await client.getEnrichmentTaskStatus(ctx.input.taskHandle);
        break;

      case 'cancel_task':
        if (!ctx.input.taskHandle) throw new Error('taskHandle is required for cancel_task');
        await client.cancelEnrichmentTask(ctx.input.taskHandle);
        result = { cancelled: true };
        break;
    }

    return {
      output: { result },
      message: `Enrichment **${ctx.input.action}** completed.`
    };
  })
  .build();
