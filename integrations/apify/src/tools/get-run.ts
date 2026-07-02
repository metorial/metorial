import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let getRun = SlateTool.create(spec, {
  name: 'Get Run',
  key: 'get_run',
  description: `Retrieve details and optionally dataset items or logs for a specific Actor run. Use this to check the status of a running or completed Actor, fetch its results, or view execution logs.`,
  instructions: [
    'Provide the run ID from a previously started Actor run.',
    'Enable includeDatasetItems to fetch the output data along with run details.',
    'Enable includeLog to fetch the execution log.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('ID of the Actor run'),
      includeDatasetItems: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to also fetch items from the run's default dataset"),
      datasetItemsLimit: z
        .number()
        .optional()
        .default(100)
        .describe('Maximum number of dataset items to return'),
      datasetItemsOffset: z
        .number()
        .optional()
        .default(0)
        .describe('Offset for dataset items pagination'),
      includeLog: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the run log')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('ID of the run'),
      actorId: z.string().describe('ID of the Actor'),
      status: z
        .string()
        .describe('Run status (READY, RUNNING, SUCCEEDED, FAILED, ABORTED, TIMED-OUT)'),
      startedAt: z.string().optional().describe('ISO timestamp when the run started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the run finished'),
      buildId: z.string().optional().describe('ID of the build used'),
      defaultDatasetId: z.string().optional().describe('Default dataset ID'),
      defaultKeyValueStoreId: z.string().optional().describe('Default key-value store ID'),
      defaultRequestQueueId: z.string().optional().describe('Default request queue ID'),
      usage: z.record(z.string(), z.any()).optional().describe('Usage statistics for the run'),
      datasetItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Items from the default dataset (if requested)'),
      log: z.string().optional().describe('Execution log text (if requested)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });
    let run = await client.getRun(ctx.input.runId);

    let datasetItems: Record<string, any>[] | undefined;
    if (ctx.input.includeDatasetItems && run.defaultDatasetId) {
      datasetItems = await client.getRunDatasetItems(ctx.input.runId, {
        limit: ctx.input.datasetItemsLimit,
        offset: ctx.input.datasetItemsOffset
      });
    }

    let log: string | undefined;
    if (ctx.input.includeLog) {
      log = await client.getLog(ctx.input.runId);
    }

    return {
      output: {
        runId: run.id,
        actorId: run.actId,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        buildId: run.buildId,
        defaultDatasetId: run.defaultDatasetId,
        defaultKeyValueStoreId: run.defaultKeyValueStoreId,
        defaultRequestQueueId: run.defaultRequestQueueId,
        usage: run.usage,
        datasetItems,
        log
      },
      message: `Run \`${run.id}\` status: **${run.status}**${datasetItems ? ` with **${datasetItems.length}** dataset item(s)` : ''}${log ? ' (log included)' : ''}.`
    };
  })
  .build();
