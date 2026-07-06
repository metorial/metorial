import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import { jsonObjectSchema, mapRun, validateRunOptions, validateWaitForFinish } from './shared';

let webhookSchema = z.object({
  eventTypes: z.array(z.string()).describe('Apify event types, such as ACTOR.RUN.SUCCEEDED'),
  requestUrl: z.string().describe('Webhook target URL'),
  payloadTemplate: z.string().optional().describe('Optional webhook payload template'),
  headersTemplate: z.string().optional().describe('Optional webhook headers template')
});

export let runActor = SlateTool.create(spec, {
  name: 'Run Actor',
  key: 'run_actor',
  description: `Start an Apify Actor run. Prefer asynchronous mode to reliably receive a runId for polling; use synchronous mode only for short runs when you need JSON dataset items immediately.`,
  instructions: [
    'Use actorId with either an Actor ID or full Actor name, such as apify/web-scraper.',
    'For reliable follow-up, leave synchronous=false and omit waitForFinish or set it to 0 so the tool returns a runId immediately.',
    'Poll Get Run with the returned runId, then use Get Dataset Items with runId or defaultDatasetId to fetch results.',
    'Use synchronous=true only for short runs; it returns datasetItems without a runId and can lose run metadata if the client connection times out.',
    'Do not recover a timed-out start by guessing from List Runs when concurrent requests may exist.'
  ],
  constraints: [
    'memory must be a power of 2 and at least 128 MB.',
    'waitForFinish applies only when synchronous=false and must be between 0 and 60 seconds.',
    'synchronous=true returns datasetItems only and does not expose a runId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      actorId: z.string().describe('Actor ID or full name, for example apify/web-scraper'),
      input: z.any().optional().describe('Input JSON object for the Actor'),
      synchronous: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, waits for completion and returns JSON dataset items directly'),
      timeout: z.number().optional().describe('Run timeout in seconds'),
      memory: z.number().optional().describe('Memory limit in MB; must be a power of 2'),
      build: z.string().optional().describe('Build tag or number to run'),
      waitForFinish: z
        .number()
        .optional()
        .describe(
          'Seconds Apify should wait before returning the run object in asynchronous mode, 0-60'
        ),
      maxItems: z.number().optional().describe('Maximum number of dataset items to produce'),
      maxTotalChargeUsd: z
        .number()
        .optional()
        .describe('Maximum total charge in USD for this run'),
      restartOnError: z.boolean().optional().describe('Whether Apify should restart on error'),
      webhooks: z
        .array(webhookSchema)
        .optional()
        .describe('Ad-hoc webhooks to attach to this specific run')
    })
  )
  .output(
    z.object({
      runId: z.string().optional().describe('Actor run ID in asynchronous mode'),
      actorId: z.string().optional().describe('Actor ID'),
      actorTaskId: z.string().optional().describe('Task ID if the run came from a task'),
      status: z.string().optional().describe('Run status'),
      startedAt: z.string().optional().describe('ISO timestamp when the run started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the run finished'),
      buildId: z.string().optional().describe('Build ID used for the run'),
      defaultDatasetId: z.string().optional().describe('Default dataset ID'),
      defaultKeyValueStoreId: z.string().optional().describe('Default key-value store ID'),
      defaultRequestQueueId: z.string().optional().describe('Default request queue ID'),
      usage: z.record(z.string(), z.any()).optional().describe('Run usage details'),
      datasetItems: z
        .array(jsonObjectSchema)
        .optional()
        .describe('JSON dataset items returned only in synchronous mode'),
      itemCount: z.number().optional().describe('Number of synchronous dataset items')
    })
  )
  .handleInvocation(async ctx => {
    validateRunOptions(ctx.input);
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.synchronous) {
      let datasetItems = await client.runActorSync(ctx.input.actorId, {
        input: ctx.input.input,
        timeout: ctx.input.timeout,
        memory: ctx.input.memory,
        build: ctx.input.build,
        maxItems: ctx.input.maxItems,
        maxTotalChargeUsd: ctx.input.maxTotalChargeUsd,
        webhooks: ctx.input.webhooks
      });

      return {
        output: {
          datasetItems,
          itemCount: datasetItems.length
        },
        message: `Actor **${ctx.input.actorId}** ran synchronously and returned **${datasetItems.length}** item(s).`
      };
    }

    validateWaitForFinish(ctx.input.waitForFinish);
    let run = await client.runActor(ctx.input.actorId, {
      input: ctx.input.input,
      timeout: ctx.input.timeout,
      memory: ctx.input.memory,
      build: ctx.input.build,
      waitForFinish: ctx.input.waitForFinish,
      maxItems: ctx.input.maxItems,
      maxTotalChargeUsd: ctx.input.maxTotalChargeUsd,
      restartOnError: ctx.input.restartOnError,
      webhooks: ctx.input.webhooks
    });
    let output = mapRun(run);

    return {
      output,
      message: `Actor **${ctx.input.actorId}** run started with status **${output.status}**. Run ID: \`${output.runId}\`.`
    };
  })
  .build();
