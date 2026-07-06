import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { jsonObjectSchema, mapRun, validateWaitForFinish } from './shared';

export let getRun = SlateTool.create(spec, {
  name: 'Get Run',
  key: 'get_run',
  description: `Retrieve an Apify Actor run by ID, optionally including JSON dataset items or the run log as a Slate attachment.`,
  instructions: [
    'Use waitForFinish to long-poll a known runId for up to 60 seconds instead of guessing from List Runs.',
    'Use includeDatasetItems for small JSON previews of the default dataset.',
    'Use includeLog to return the execution log as an attachment instead of inline text.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      runId: z.string().describe('Actor run ID'),
      waitForFinish: z
        .number()
        .optional()
        .describe('Seconds Apify should wait for this run to finish before returning, 0-60'),
      includeDatasetItems: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to fetch items from the run's default dataset"),
      datasetItemsLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .default(100)
        .describe('Maximum number of dataset items to return'),
      datasetItemsOffset: z.number().int().min(0).optional().default(0),
      includeLog: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to return the run log as an attachment')
    })
  )
  .output(
    z.object({
      runId: z.string().describe('Actor run ID'),
      actorId: z.string().optional().describe('Actor ID'),
      actorTaskId: z.string().optional().describe('Task ID if applicable'),
      status: z.string().optional().describe('Run status'),
      startedAt: z.string().optional().describe('ISO timestamp when the run started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the run finished'),
      buildId: z.string().optional().describe('Build ID used'),
      defaultDatasetId: z.string().optional().describe('Default dataset ID'),
      defaultKeyValueStoreId: z.string().optional().describe('Default key-value store ID'),
      defaultRequestQueueId: z.string().optional().describe('Default request queue ID'),
      usage: z.record(z.string(), z.any()).optional().describe('Run usage details'),
      datasetItems: z.array(jsonObjectSchema).optional().describe('Preview dataset items'),
      datasetItemCount: z.number().optional().describe('Number of preview items returned'),
      logMimeType: z.string().optional().describe('MIME type of the log attachment'),
      logByteLength: z.number().optional().describe('Log attachment size in bytes'),
      attachmentCount: z.number().optional().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    validateWaitForFinish(ctx.input.waitForFinish);
    let client = new ApifyClient({ token: ctx.auth.token });
    let run = await client.getRun(ctx.input.runId, {
      waitForFinish: ctx.input.waitForFinish
    });
    let output = mapRun(run);

    let datasetItems: Record<string, any>[] | undefined;
    if (ctx.input.includeDatasetItems && run.defaultDatasetId) {
      datasetItems = await client.getRunDatasetItems(ctx.input.runId, {
        limit: ctx.input.datasetItemsLimit,
        offset: ctx.input.datasetItemsOffset
      });
    }

    let attachments: ReturnType<typeof createTextAttachment>[] = [];
    let logMetadata: {
      logMimeType?: string;
      logByteLength?: number;
      attachmentCount?: number;
    } = {};

    if (ctx.input.includeLog) {
      let log = await client.getLog(ctx.input.runId);
      attachments.push(createTextAttachment(log.contentText ?? '', log.contentType));
      logMetadata = {
        logMimeType: log.contentType,
        logByteLength: log.byteLength,
        attachmentCount: 1
      };
    }

    return {
      output: {
        ...output,
        datasetItems,
        datasetItemCount: datasetItems?.length,
        ...logMetadata
      },
      attachments,
      message: `Run \`${ctx.input.runId}\` status: **${output.status}**${datasetItems ? ` with **${datasetItems.length}** preview item(s)` : ''}${attachments.length ? ' and 1 log attachment' : ''}.`
    };
  })
  .build();
