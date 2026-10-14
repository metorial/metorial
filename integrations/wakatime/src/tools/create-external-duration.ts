import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let externalDurationSchema = z.object({
  externalId: z.string().describe('Unique external ID for deduplication'),
  entity: z
    .string()
    .describe('Name or description of the activity (e.g., "Team standup", "Code review")'),
  type: z
    .string()
    .default('app')
    .describe('Entity type: "file", "app", "event", "url", or "domain"'),
  startTime: z.number().describe('Start time as UNIX epoch timestamp'),
  endTime: z.number().describe('End time as UNIX epoch timestamp'),
  project: z.string().optional().describe('Associated project name'),
  branch: z.string().optional().describe('Associated branch name'),
  language: z.string().optional().describe('Associated language'),
  category: z
    .string()
    .optional()
    .describe('Category: "communicating", "code reviewing", "designing", "researching", etc.'),
  meta: z.string().max(2083).optional().describe('Optional metadata for custom rule matching')
});

export let createExternalDuration = SlateTool.create(spec, {
  name: 'Create External Duration',
  key: 'create_external_duration',
  description: `Record activity durations from sources other than IDE plugins, such as calendar events, meetings, or code reviews. Supports both single and bulk creation. Uses an external ID for deduplication so the same event won't be recorded twice.`,
  instructions: [
    'Only OAuth-authenticated apps can create external durations.',
    'The externalId is used for deduplication — resubmitting the same externalId will update the existing record.',
    'Activity must be within one year of today and after the WakaTime account was created. Bulk requests support at most 1,000 durations.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      durations: z
        .array(externalDurationSchema)
        .min(1)
        .max(1000)
        .describe('One or more external durations to create')
    })
  )
  .output(
    z.object({
      createdCount: z.number().describe('Number of external durations created'),
      responses: z.array(z.any()).describe('API responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient(ctx.auth);

    for (let duration of ctx.input.durations) {
      if (duration.endTime <= duration.startTime) {
        throw createApiServiceError('Each external duration must end after it starts.');
      }
      if (!['file', 'app', 'event', 'url', 'domain'].includes(duration.type)) {
        throw createApiServiceError(
          'External duration type must be file, app, event, url, or domain.'
        );
      }
    }

    let responses: unknown[];
    let createdCount: number;
    if (ctx.input.durations.length === 1) {
      let result = await client.createExternalDuration(ctx.input.durations[0]!);
      responses = [result];
      createdCount = 1;
    } else {
      let result = await client.createExternalDurationsBulk(ctx.input.durations);
      let parsed = z.object({ status_codes: z.array(z.number().int()) }).safeParse(result);
      if (!parsed.success || parsed.data.status_codes.length !== ctx.input.durations.length) {
        throw createApiServiceError(
          'WakaTime returned an unexpected bulk duration response. Check recorded activity before retrying.'
        );
      }
      responses = parsed.data.status_codes;
      createdCount = parsed.data.status_codes.filter(
        status => status >= 200 && status < 300
      ).length;
    }

    return {
      output: {
        createdCount,
        responses
      },
      message: `Created or updated **${createdCount}** of **${ctx.input.durations.length}** external duration(s). Check responses for any rejected durations.`
    };
  })
  .build();
