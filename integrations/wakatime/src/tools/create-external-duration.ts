import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

let externalDurationSchema = z.object({
  externalId: z.string().describe('Unique external ID for deduplication'),
  entity: z
    .string()
    .describe('Name or description of the activity (e.g., "Team standup", "Code review")'),
  type: z.string().default('app').describe('Entity type (e.g., "app", "domain")'),
  startTime: z.number().describe('Start time as UNIX epoch timestamp'),
  endTime: z.number().describe('End time as UNIX epoch timestamp'),
  project: z.string().optional().describe('Associated project name'),
  branch: z.string().optional().describe('Associated branch name'),
  language: z.string().optional().describe('Associated language'),
  category: z
    .string()
    .optional()
    .describe('Category: "communicating", "code reviewing", "designing", "researching", etc.')
});

export let createExternalDuration = SlateTool.create(spec, {
  name: 'Create External Duration',
  key: 'create_external_duration',
  description: `Record activity durations from sources other than IDE plugins, such as calendar events, meetings, or code reviews. Supports both single and bulk creation. Uses an external ID for deduplication so the same event won't be recorded twice.`,
  instructions: [
    'Only OAuth-authenticated apps can create external durations.',
    'The externalId is used for deduplication — resubmitting the same externalId will update the existing record.'
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
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let responses: any[];
    if (ctx.input.durations.length === 1) {
      let result = await client.createExternalDuration(ctx.input.durations[0]!);
      responses = [result];
    } else {
      let result = await client.createExternalDurationsBulk(ctx.input.durations);
      responses = Array.isArray(result.data) ? result.data : [result];
    }

    return {
      output: {
        createdCount: ctx.input.durations.length,
        responses
      },
      message: `Created **${ctx.input.durations.length}** external duration(s).`
    };
  })
  .build();
