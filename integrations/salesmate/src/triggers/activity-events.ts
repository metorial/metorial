import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let activityEvents = SlateTrigger.create(spec, {
  name: 'Activity Events',
  key: 'activity_events',
  description:
    'Triggers when activities (tasks, calls, meetings) are created or updated in Salesmate.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of activity event'),
      activityId: z.string().describe('ID of the activity'),
      activity: z.record(z.string(), z.unknown()).describe('Activity record data')
    })
  )
  .output(
    z.object({
      activityId: z.string().describe('ID of the activity'),
      title: z.string().optional().describe('Activity title'),
      type: z.string().optional().describe('Activity type (Call, Task, Meeting, etc.)'),
      dueDate: z.string().optional().describe('Due date'),
      isCompleted: z.unknown().optional().describe('Whether the activity is completed'),
      owner: z.unknown().optional().describe('Activity owner'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      rawRecord: z.record(z.string(), z.unknown()).describe('Full activity record')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = createClient(ctx);
      let lastPolledAt = (ctx.state as Record<string, unknown>)?.lastPolledAt as
        | string
        | undefined;
      let now = new Date().toISOString();

      let fields = [
        'title',
        'type',
        'dueDate',
        'isCompleted',
        'owner',
        'createdAt',
        'modifiedAt'
      ];

      let filters = lastPolledAt
        ? [
            {
              moduleName: 'Task',
              field: { fieldName: 'modifiedAt' },
              condition: 'GREATER_THAN',
              data: lastPolledAt
            }
          ]
        : [];

      let query =
        filters.length > 0
          ? {
              group: {
                operator: 'AND' as const,
                rules: filters
              }
            }
          : undefined;

      let result = await client.searchActivities({
        fields,
        query,
        sortBy: 'modifiedAt',
        sortOrder: 'desc',
        pageNo: 1,
        rows: 100
      });

      let records = result?.Data?.data ?? [];

      let inputs = records.map((record: Record<string, unknown>) => {
        let recordId = String(record.id ?? '');
        let createdAt = record.createdAt as string | undefined;
        let modifiedAt = record.modifiedAt as string | undefined;
        let isNew = !lastPolledAt || (createdAt && modifiedAt && createdAt === modifiedAt);
        return {
          eventType: isNew ? ('created' as const) : ('updated' as const),
          activityId: recordId,
          activity: record
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolledAt: now
        }
      };
    },
    handleEvent: async ctx => {
      let record = ctx.input.activity;
      return {
        type: `activity.${ctx.input.eventType}`,
        id: `activity-${ctx.input.activityId}-${Date.now()}`,
        output: {
          activityId: ctx.input.activityId,
          title: record.title as string | undefined,
          type: record.type as string | undefined,
          dueDate: record.dueDate as string | undefined,
          isCompleted: record.isCompleted,
          owner: record.owner,
          createdAt: record.createdAt as string | undefined,
          modifiedAt: record.modifiedAt as string | undefined,
          rawRecord: record
        }
      };
    }
  })
  .build();
