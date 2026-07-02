import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let itemEvent = SlateTrigger.create(spec, {
  name: 'Item Event',
  key: 'item_event',
  description:
    'Triggers on Rollbar item events: new items, occurrences, exponential occurrences, high occurrence rate, item resolved, reopened, or reactivated.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (new_item, occurrence, exp_repeat_item, item_velocity, resolved_item, reopened_item, reactivated_item)'
        ),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      item: z
        .object({
          itemId: z.number().optional().describe('Unique item ID'),
          counter: z.number().optional().describe('Project-specific item counter'),
          title: z.string().optional().describe('Item title/message'),
          status: z.string().optional().describe('Current item status'),
          level: z.string().optional().describe('Severity level'),
          environment: z.string().optional().describe('Environment name'),
          framework: z.string().optional().describe('Framework'),
          platform: z.string().optional().describe('Platform'),
          totalOccurrences: z.number().optional().describe('Total number of occurrences'),
          lastOccurrenceTimestamp: z
            .number()
            .optional()
            .describe('Unix timestamp of last occurrence'),
          projectId: z.number().optional().describe('Project ID')
        })
        .describe('Item data'),
      occurrence: z
        .object({
          occurrenceId: z.string().optional().describe('Occurrence ID'),
          timestamp: z.number().optional().describe('Unix timestamp of the occurrence'),
          body: z.any().optional().describe('Occurrence body with error/message details'),
          server: z.any().optional().describe('Server information'),
          request: z.any().optional().describe('HTTP request details'),
          person: z.any().optional().describe('Person associated with the occurrence'),
          codeVersion: z.string().optional().describe('Code version')
        })
        .optional()
        .describe('Occurrence data (if available)'),
      velocityInfo: z
        .object({
          windowSize: z.number().optional().describe('Time window in seconds'),
          windowSizeDescription: z.string().optional().describe('Human-readable time window'),
          threshold: z
            .number()
            .optional()
            .describe('Number of events that triggered the notification')
        })
        .optional()
        .describe('High occurrence rate info (for item_velocity events)'),
      expRepeatInfo: z
        .object({
          occurrenceThreshold: z
            .number()
            .optional()
            .describe('Occurrence threshold that was crossed (10, 100, 1000, etc.)')
        })
        .optional()
        .describe('Exponential repeat info (for exp_repeat_item events)')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique item ID'),
      counter: z.number().optional().describe('Project-specific item counter'),
      title: z.string().optional().describe('Item title/message'),
      status: z.string().optional().describe('Current item status'),
      level: z.string().optional().describe('Severity level'),
      environment: z.string().optional().describe('Environment name'),
      framework: z.string().optional().describe('Framework'),
      platform: z.string().optional().describe('Platform'),
      totalOccurrences: z.number().optional().describe('Total number of occurrences'),
      lastOccurrenceTimestamp: z
        .number()
        .optional()
        .describe('Unix timestamp of last occurrence'),
      projectId: z.number().optional().describe('Project ID'),
      occurrenceId: z
        .string()
        .optional()
        .describe('Occurrence ID (if triggered by a specific occurrence)'),
      occurrenceTimestamp: z.number().optional().describe('Occurrence timestamp'),
      occurrenceBody: z.any().optional().describe('Occurrence body'),
      velocityWindowSize: z.number().optional().describe('Velocity window size in seconds'),
      velocityWindowSizeDescription: z
        .string()
        .optional()
        .describe('Human-readable velocity window'),
      velocityThreshold: z.number().optional().describe('Velocity threshold that was reached'),
      occurrenceThreshold: z
        .number()
        .optional()
        .describe('Exponential occurrence threshold crossed')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event_name;
      let eventData = data.data || {};
      let item = eventData.item || {};
      let occurrence = eventData.occurrence || {};
      let lastOccurrence = eventData.last_occurrence || {};

      let occurrenceData = occurrence.id
        ? occurrence
        : lastOccurrence.id
          ? lastOccurrence
          : undefined;

      let eventId = `${eventType}_${item.id || 'unknown'}_${occurrenceData?.id || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            item: {
              itemId: item.id,
              counter: item.counter,
              title: item.title,
              status: item.status,
              level: item.level_string || item.level,
              environment: item.environment,
              framework: item.framework,
              platform: item.platform,
              totalOccurrences: item.total_occurrences,
              lastOccurrenceTimestamp: item.last_occurrence_timestamp,
              projectId: item.project_id
            },
            occurrence: occurrenceData
              ? {
                  occurrenceId: occurrenceData.id?.toString(),
                  timestamp: occurrenceData.timestamp,
                  body: occurrenceData.body || occurrenceData.data?.body,
                  server: occurrenceData.server || occurrenceData.data?.server,
                  request: occurrenceData.request || occurrenceData.data?.request,
                  person: occurrenceData.person || occurrenceData.data?.person,
                  codeVersion: occurrenceData.code_version || occurrenceData.data?.code_version
                }
              : undefined,
            velocityInfo:
              eventType === 'item_velocity'
                ? {
                    windowSize: eventData.window_size,
                    windowSizeDescription: eventData.window_size_description,
                    threshold: eventData.threshold
                  }
                : undefined,
            expRepeatInfo:
              eventType === 'exp_repeat_item'
                ? {
                    occurrenceThreshold:
                      eventData.occurrence_threshold || eventData.occurrences
                  }
                : undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, item, occurrence, velocityInfo, expRepeatInfo } = ctx.input;

      return {
        type: `item.${eventType}`,
        id: eventId,
        output: {
          itemId: item.itemId || 0,
          counter: item.counter,
          title: item.title,
          status: item.status,
          level: item.level,
          environment: item.environment,
          framework: item.framework,
          platform: item.platform,
          totalOccurrences: item.totalOccurrences,
          lastOccurrenceTimestamp: item.lastOccurrenceTimestamp,
          projectId: item.projectId,
          occurrenceId: occurrence?.occurrenceId,
          occurrenceTimestamp: occurrence?.timestamp,
          occurrenceBody: occurrence?.body,
          velocityWindowSize: velocityInfo?.windowSize,
          velocityWindowSizeDescription: velocityInfo?.windowSizeDescription,
          velocityThreshold: velocityInfo?.threshold,
          occurrenceThreshold: expRepeatInfo?.occurrenceThreshold
        }
      };
    }
  })
  .build();
