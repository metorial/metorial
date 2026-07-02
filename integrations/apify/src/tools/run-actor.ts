import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let runActor = SlateTool.create(spec, {
  name: 'Run Actor',
  key: 'run_actor',
  description: `Start an Actor run on Apify, either asynchronously (returns immediately with run details) or synchronously (waits for completion and returns dataset items).
Use this to execute web scrapers, automation tools, or any Actor from the Apify Store or your own custom Actors.`,
  instructions: [
    'Use the Actor ID or full name (e.g. "apify/web-scraper") to identify the Actor.',
    'Set synchronous to true to wait for results (max 5 minutes). For longer-running Actors, use asynchronous mode and poll with Get Run.',
    'Memory must be a power of 2 (minimum 128 MB).'
  ],
  constraints: [
    'Synchronous runs time out after 300 seconds.',
    'Memory must be a power of 2, minimum 128 MB.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      actorId: z.string().describe('Actor ID or full name (e.g. "apify/web-scraper")'),
      input: z.any().optional().describe('Input JSON object for the Actor'),
      synchronous: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'If true, waits for the run to complete and returns dataset items directly (max 5 min)'
        ),
      timeout: z.number().optional().describe('Timeout in seconds for the run'),
      memory: z
        .number()
        .optional()
        .describe('Memory limit in MB (must be a power of 2, min 128)'),
      build: z
        .string()
        .optional()
        .describe('Build tag or number to run (e.g. "latest", "beta")')
    })
  )
  .output(
    z.object({
      runId: z.string().optional().describe('ID of the Actor run (async mode)'),
      actorId: z.string().optional().describe('ID of the Actor'),
      status: z
        .string()
        .optional()
        .describe('Run status (e.g. READY, RUNNING, SUCCEEDED, FAILED)'),
      startedAt: z.string().optional().describe('ISO timestamp when the run started'),
      finishedAt: z.string().optional().describe('ISO timestamp when the run finished'),
      defaultDatasetId: z
        .string()
        .optional()
        .describe('ID of the default dataset for this run'),
      defaultKeyValueStoreId: z
        .string()
        .optional()
        .describe('ID of the default key-value store for this run'),
      defaultRequestQueueId: z
        .string()
        .optional()
        .describe('ID of the default request queue for this run'),
      datasetItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Dataset items (only in synchronous mode)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.synchronous) {
      let items = await client.runActorSync(ctx.input.actorId, {
        input: ctx.input.input,
        timeout: ctx.input.timeout,
        memory: ctx.input.memory,
        build: ctx.input.build
      });

      let datasetItems = Array.isArray(items) ? items : [];

      return {
        output: {
          datasetItems
        },
        message: `Actor **${ctx.input.actorId}** ran synchronously and returned **${datasetItems.length}** dataset item(s).`
      };
    }

    let run = await client.runActor(ctx.input.actorId, {
      input: ctx.input.input,
      timeout: ctx.input.timeout,
      memory: ctx.input.memory,
      build: ctx.input.build
    });

    return {
      output: {
        runId: run.id,
        actorId: run.actId,
        status: run.status,
        startedAt: run.startedAt,
        finishedAt: run.finishedAt,
        defaultDatasetId: run.defaultDatasetId,
        defaultKeyValueStoreId: run.defaultKeyValueStoreId,
        defaultRequestQueueId: run.defaultRequestQueueId
      },
      message: `Actor **${ctx.input.actorId}** run started with status **${run.status}**. Run ID: \`${run.id}\``
    };
  })
  .build();
