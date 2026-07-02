import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let byomEvent = SlateTrigger.create(spec, {
  name: 'BYOM Event',
  key: 'byom_event',
  description:
    'Triggered when Bring Your Own Model (BYOM) events occur, such as rate limiting or request failures from your own LLM provider credentials.'
})
  .input(
    z.object({
      eventName: z.string().describe('Name of the BYOM event'),
      accountUuid: z.string().optional().describe('Account UUID'),
      projectUuid: z.string().optional().describe('Project UUID'),
      provider: z.string().optional().describe('LLM provider name'),
      model: z.string().optional().describe('Model name'),
      count: z.number().optional().describe('Number of occurrences in the aggregation window'),
      firstOccurrence: z
        .string()
        .optional()
        .describe('Timestamp of first occurrence in window'),
      lastOccurrence: z.string().optional().describe('Timestamp of last occurrence in window'),
      windowSeconds: z.number().optional().describe('Aggregation window duration in seconds'),
      errorCode: z.string().optional().describe('Error code from the provider'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      eventName: z
        .string()
        .describe('BYOM event name (byom.rate_limited or byom.request_failed)'),
      provider: z
        .string()
        .optional()
        .nullable()
        .describe('LLM provider that triggered the event'),
      model: z.string().optional().nullable().describe('Model that triggered the event'),
      count: z
        .number()
        .optional()
        .nullable()
        .describe('Number of occurrences in the 60-second aggregation window'),
      firstOccurrence: z
        .string()
        .optional()
        .nullable()
        .describe('Timestamp of first occurrence'),
      lastOccurrence: z
        .string()
        .optional()
        .nullable()
        .describe('Timestamp of last occurrence'),
      windowSeconds: z
        .number()
        .optional()
        .nullable()
        .describe('Aggregation window duration in seconds'),
      errorCode: z.string().optional().nullable().describe('Error code from the LLM provider'),
      accountUuid: z.string().optional().nullable().describe('Account UUID'),
      projectUuid: z.string().optional().nullable().describe('Project UUID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      return {
        inputs: [
          {
            eventName: data.event_name || 'unknown',
            accountUuid: data.account_uuid,
            projectUuid: data.project_uuid,
            provider: data.provider,
            model: data.model,
            count: data.count,
            firstOccurrence: data.first_occurrence,
            lastOccurrence: data.last_occurrence,
            windowSeconds: data.window_seconds,
            errorCode: data.error_code,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventName.includes('.')
        ? ctx.input.eventName
        : `byom.${ctx.input.eventName}`;

      let dedupId = [
        eventType,
        ctx.input.provider || '',
        ctx.input.model || '',
        ctx.input.lastOccurrence || Date.now().toString()
      ].join('-');

      return {
        type: eventType,
        id: dedupId,
        output: {
          eventName: ctx.input.eventName,
          provider: ctx.input.provider,
          model: ctx.input.model,
          count: ctx.input.count,
          firstOccurrence: ctx.input.firstOccurrence,
          lastOccurrence: ctx.input.lastOccurrence,
          windowSeconds: ctx.input.windowSeconds,
          errorCode: ctx.input.errorCode,
          accountUuid: ctx.input.accountUuid,
          projectUuid: ctx.input.projectUuid
        }
      };
    }
  })
  .build();
