import { SlateTool } from 'slates';
import { z } from 'zod';
import { CountdownClient } from '../lib/client';
import { spec } from '../spec';

export let manageCollection = SlateTool.create(spec, {
  name: 'Manage Collection',
  key: 'manage_collection',
  description: `Create, update, start, stop, or delete a bulk request collection. Collections allow scheduling up to 15,000 eBay API requests to run on a schedule (monthly, weekly, daily, hourly, or manually). Supports webhook notifications and cloud storage destinations for result delivery.`,
  instructions: [
    'Use `action: "create"` to create a new collection with a name and optional schedule.',
    'Use `action: "update"` with `collectionId` to modify an existing collection.',
    'Use `action: "start"` or `action: "stop"` to control collection execution.',
    'Use `action: "delete"` to remove a collection (cannot delete while running).',
    'The `requestsType` is locked after creation and cannot be changed.'
  ],
  constraints: [
    'Maximum 15,000 requests per collection (100 if include_html=true).',
    'Maximum 10,000 collections per account.',
    'Collections are auto-deleted after 2 months of inactivity.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'start', 'stop', 'delete'])
        .describe('The action to perform on the collection.'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID. Required for update, start, stop, and delete actions.'),
      name: z.string().optional().describe('Collection name. Required for create.'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the collection auto-starts on schedule.'),
      scheduleType: z
        .enum(['monthly', 'weekly', 'daily', 'minutes', 'manual'])
        .optional()
        .describe('Schedule frequency.'),
      priority: z
        .enum(['highest', 'high', 'normal', 'low', 'lowest'])
        .optional()
        .describe('Queue priority for the collection.'),
      scheduleDaysOfMonth: z
        .array(z.number())
        .optional()
        .describe('Days of month to run (1-31). For monthly or minutes schedules.'),
      scheduleDaysOfWeek: z
        .array(z.number())
        .optional()
        .describe(
          'Days of week to run (0=Sunday through 6=Saturday). For weekly or minutes schedules.'
        ),
      scheduleHours: z.array(z.number()).optional().describe('Hours to run (0-23).'),
      scheduleMinutes: z
        .string()
        .optional()
        .describe(
          'Frequency interval (e.g., every_minute, every_5_minutes). For minutes schedule type.'
        ),
      destinationIds: z
        .array(z.string())
        .optional()
        .describe('Cloud storage destination IDs for automatic upload of results.'),
      notificationEmail: z
        .string()
        .optional()
        .describe('Email address for completion notifications.'),
      notificationWebhook: z
        .string()
        .optional()
        .describe('Webhook URL for completion notifications (HTTP POST).'),
      notificationAsJson: z
        .boolean()
        .optional()
        .describe('Include JSON format in notifications.'),
      notificationAsJsonlines: z
        .boolean()
        .optional()
        .describe('Include JSON Lines format in notifications.'),
      notificationAsCsv: z
        .boolean()
        .optional()
        .describe('Include CSV format in notifications.'),
      notificationCsvFields: z
        .string()
        .optional()
        .describe('Comma-separated CSV fields list (dot notation).'),
      requestsType: z
        .enum([
          'mixed',
          'search',
          'product',
          'reviews',
          'seller_profile',
          'seller_feedback',
          'autocomplete',
          'deals'
        ])
        .optional()
        .describe('Lock collection to a specific request type. Only settable on create.')
    })
  )
  .output(
    z.object({
      collection: z
        .any()
        .optional()
        .describe('Collection object with id, name, status, schedule, and settings.'),
      success: z.boolean().describe('Whether the action was successful.'),
      actionPerformed: z.string().describe('The action that was performed.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CountdownClient({ token: ctx.auth.token });
    let { action, collectionId } = ctx.input;

    if (action !== 'create' && !collectionId) {
      throw new Error(`collectionId is required for action "${action}".`);
    }

    let result: any;

    switch (action) {
      case 'create': {
        if (!ctx.input.name) {
          throw new Error('name is required when creating a collection.');
        }
        result = await client.createCollection({
          name: ctx.input.name,
          enabled: ctx.input.enabled,
          scheduleType: ctx.input.scheduleType,
          priority: ctx.input.priority,
          scheduleDaysOfMonth: ctx.input.scheduleDaysOfMonth,
          scheduleDaysOfWeek: ctx.input.scheduleDaysOfWeek,
          scheduleHours: ctx.input.scheduleHours,
          scheduleMinutes: ctx.input.scheduleMinutes,
          destinationIds: ctx.input.destinationIds,
          notificationEmail: ctx.input.notificationEmail,
          notificationWebhook: ctx.input.notificationWebhook,
          notificationAsJson: ctx.input.notificationAsJson,
          notificationAsJsonlines: ctx.input.notificationAsJsonlines,
          notificationAsCsv: ctx.input.notificationAsCsv,
          notificationCsvFields: ctx.input.notificationCsvFields,
          requestsType: ctx.input.requestsType
        });
        break;
      }
      case 'update': {
        result = await client.updateCollection(collectionId!, {
          name: ctx.input.name,
          enabled: ctx.input.enabled,
          scheduleType: ctx.input.scheduleType,
          priority: ctx.input.priority,
          scheduleDaysOfMonth: ctx.input.scheduleDaysOfMonth,
          scheduleDaysOfWeek: ctx.input.scheduleDaysOfWeek,
          scheduleHours: ctx.input.scheduleHours,
          scheduleMinutes: ctx.input.scheduleMinutes,
          destinationIds: ctx.input.destinationIds,
          notificationEmail: ctx.input.notificationEmail,
          notificationWebhook: ctx.input.notificationWebhook,
          notificationAsJson: ctx.input.notificationAsJson,
          notificationAsJsonlines: ctx.input.notificationAsJsonlines,
          notificationAsCsv: ctx.input.notificationAsCsv,
          notificationCsvFields: ctx.input.notificationCsvFields
        });
        break;
      }
      case 'start': {
        result = await client.startCollection(collectionId!);
        break;
      }
      case 'stop': {
        result = await client.stopCollection(collectionId!);
        break;
      }
      case 'delete': {
        result = await client.deleteCollection(collectionId!);
        break;
      }
    }

    let collection = result.collection;
    let success = result.request_info?.success ?? true;

    return {
      output: {
        collection,
        success,
        actionPerformed: action
      },
      message: `Collection **${action}** ${success ? 'succeeded' : 'failed'}${collection?.id ? ` (ID: ${collection.id})` : ''}${collection?.name ? ` — "${collection.name}"` : ''}.`
    };
  })
  .build();
