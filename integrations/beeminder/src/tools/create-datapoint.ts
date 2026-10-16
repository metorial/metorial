import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { datapointSchema, mapDatapoint, responseArray } from '../lib/schemas';
import { spec } from '../spec';

export let createDatapoint = SlateTool.create(spec, {
  name: 'Create Datapoint',
  key: 'create_datapoint',
  description: `Add one or more datapoints to a Beeminder goal. This is the primary way to track progress. Supports single or batch creation, with optional idempotent upserts via requestId.`,
  instructions: [
    'Provide either a timestamp (unix) or daystamp (YYYYMMDD format) to set the date. If neither is provided, the current time is used.',
    'Use requestId for idempotent submissions — resending the same requestId will update the existing datapoint rather than creating a duplicate.'
  ]
})
  .input(
    z.object({
      goalSlug: z.string().describe('URL-friendly identifier of the goal to add data to'),
      datapoints: z
        .array(
          z.object({
            value: z.number().describe('Numeric value for the datapoint'),
            timestamp: z.number().optional().describe('Unix timestamp for the datapoint'),
            daystamp: z.string().optional().describe('Date in YYYYMMDD format'),
            comment: z.string().optional().describe('Optional comment'),
            requestId: z
              .string()
              .optional()
              .describe('Unique client ID for idempotent upserts')
          })
        )
        .min(1)
        .describe('Datapoints to create (one or more)')
    })
  )
  .output(
    z.object({
      datapoints: z
        .array(datapointSchema)
        .describe('Successfully created or updated datapoints'),
      errors: z
        .array(z.unknown())
        .optional()
        .describe('Provider batch errors when some submissions failed'),
      partialSuccess: z
        .boolean()
        .optional()
        .describe('Whether the batch contains provider-reported errors'),
      raw: z.unknown().optional().describe('Complete provider creation response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username,
      authType: ctx.auth.authType
    });

    let raw: unknown;

    if (ctx.input.datapoints.length === 1) {
      let dp = ctx.input.datapoints[0]!;
      raw = await client.createDatapoint(ctx.input.goalSlug, {
        value: dp.value,
        timestamp: dp.timestamp,
        daystamp: dp.daystamp,
        comment: dp.comment,
        requestid: dp.requestId
      });
    } else {
      let mapped = ctx.input.datapoints.map(dp => ({
        value: dp.value,
        timestamp: dp.timestamp,
        daystamp: dp.daystamp,
        comment: dp.comment,
        requestid: dp.requestId
      }));
      raw = await client.createDatapoints(ctx.input.goalSlug, mapped);
    }

    let errors: unknown[] | undefined;
    let results: unknown[];
    if (isApiErrorRecord(raw) && Array.isArray(raw.successes)) {
      if (!Array.isArray(raw.errors)) {
        throw createApiServiceError('Beeminder returned an invalid batch error list.', {
          reason: 'beeminder_invalid_response'
        });
      }
      errors = raw.errors;
      results = raw.successes;
    } else results = ctx.input.datapoints.length === 1 ? [raw] : responseArray(raw);
    let datapoints = results.map(mapDatapoint);

    return {
      output: {
        datapoints,
        errors,
        partialSuccess: errors ? errors.length > 0 : undefined,
        raw
      },
      message: `Added **${datapoints.length}** datapoint(s) to goal **${ctx.input.goalSlug}**.${errors?.length ? ` ${errors.length} submission(s) failed; inspect errors before retrying.` : ''}`
    };
  })
  .build();
