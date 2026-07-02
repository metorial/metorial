import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let contextElementSchema = z.enum(['user', 'org', 'location', 'device']);
let eventTypeSchema = z.enum([
  'navigate',
  'click',
  'dead-click',
  'error-click',
  'rage-click',
  'input-change',
  'network-error',
  'console-error',
  'mouse-thrash',
  'highlight',
  'copy',
  'paste',
  'element-seen'
]);

export let generateSessionContext = SlateTool.create(spec, {
  name: 'Generate Session Context',
  key: 'generate_session_context',
  description:
    'Generate a structured, AI-friendly context summary for a FullStory session, including selected session metadata and transformed event details.',
  constraints: ['Part of FullStory Anywhere: Activation.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z
        .string()
        .describe('Canonical FullStory session ID, usually formatted as userId:sessionId'),
      sliceMode: z
        .enum(['UNSPECIFIED', 'FIRST', 'LAST', 'TIMESTAMP'])
        .optional()
        .describe('How to slice the session event stream. Defaults to FIRST in FullStory.'),
      eventLimit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of events to include when greater than zero'),
      durationLimitMs: z
        .string()
        .optional()
        .describe('Duration window in milliseconds, encoded as an int64 string'),
      startTimestamp: z
        .string()
        .optional()
        .describe('Start timestamp for TIMESTAMP slicing or bounded context'),
      endTimestamp: z.string().optional().describe('Exclude events after this timestamp'),
      includeContext: z
        .array(contextElementSchema)
        .optional()
        .describe('Context elements to include: user, org, location, device'),
      excludeContext: z
        .array(contextElementSchema)
        .optional()
        .describe('Context elements to exclude: user, org, location, device'),
      excludeOrgContext: z.boolean().optional().describe('Exclude organization context'),
      excludeUserContext: z.boolean().optional().describe('Exclude user context'),
      excludeLocation: z.boolean().optional().describe('Exclude location context'),
      excludeDevice: z.boolean().optional().describe('Exclude device context'),
      includeEventTypes: z
        .array(eventTypeSchema)
        .optional()
        .describe('Only include these event types'),
      excludeEventTypes: z
        .array(eventTypeSchema)
        .optional()
        .describe('Exclude these event types'),
      excludeDefinedEvents: z.boolean().optional().describe('Exclude defined events'),
      excludeApiEvents: z.boolean().optional().describe('Exclude server/API events'),
      excludeEventTimestamps: z.boolean().optional().describe('Exclude event timestamps'),
      excludeSelectors: z.boolean().optional().describe('Exclude selector details'),
      includeSelectorTags: z.boolean().optional().describe('Include selector tag names'),
      trimToLastNSelectors: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Trim event selectors to the last N selectors'),
      includeTabIndex: z.boolean().optional().describe('Include browser tab indexes'),
      includeDescriptions: z
        .boolean()
        .optional()
        .describe('Include FullStory-generated event descriptions'),
      enableEventCache: z.boolean().optional().describe('Enable FullStory event caching')
    })
  )
  .output(
    z.object({
      contextData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Generated FullStory session context data'),
      rawResponse: z.record(z.string(), z.any()).describe('Complete FullStory response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.generateSessionContext({
      sessionId: ctx.input.sessionId,
      sliceMode: ctx.input.sliceMode,
      eventLimit: ctx.input.eventLimit,
      durationLimitMs: ctx.input.durationLimitMs,
      startTimestamp: ctx.input.startTimestamp,
      endTimestamp: ctx.input.endTimestamp,
      includeContext: ctx.input.includeContext,
      excludeContext: ctx.input.excludeContext,
      excludeOrgContext: ctx.input.excludeOrgContext,
      excludeUserContext: ctx.input.excludeUserContext,
      excludeLocation: ctx.input.excludeLocation,
      excludeDevice: ctx.input.excludeDevice,
      includeEventTypes: ctx.input.includeEventTypes,
      excludeEventTypes: ctx.input.excludeEventTypes,
      excludeDefinedEvents: ctx.input.excludeDefinedEvents,
      excludeApiEvents: ctx.input.excludeApiEvents,
      excludeEventTimestamps: ctx.input.excludeEventTimestamps,
      excludeSelectors: ctx.input.excludeSelectors,
      includeSelectorTags: ctx.input.includeSelectorTags,
      trimToLastNSelectors: ctx.input.trimToLastNSelectors,
      includeTabIndex: ctx.input.includeTabIndex,
      includeDescriptions: ctx.input.includeDescriptions,
      enableEventCache: ctx.input.enableEventCache
    });
    let contextData =
      typeof result.context_data === 'object' && result.context_data !== null
        ? result.context_data
        : undefined;

    return {
      output: {
        contextData,
        rawResponse: result
      },
      message: `Generated session context for \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
