import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCollections = SlateTool.create(spec, {
  name: 'Manage Collections',
  key: 'manage_collections',
  description: `Create, list, get, update, start, or delete RedCircle API collections. Collections allow you to schedule and run up to 15,000 requests in bulk. They can run manually or on a schedule (daily, weekly, monthly, or by minutes), with results delivered via webhook or cloud storage destinations.`,
  instructions: [
    'Use action "list" to browse collections with optional filters.',
    'Use action "get" to retrieve a specific collection by ID.',
    'Use action "create" to set up a new collection with schedule and notification settings.',
    'Use action "update" to modify an existing collection (cannot update while running).',
    'Use action "start" to manually trigger a collection run.',
    'Use action "delete" to remove a collection (cannot delete while running).'
  ],
  constraints: [
    'Collections list endpoint: 60 requests per minute.',
    'Maximum 15,000 requests per collection (100 if include_html=true).',
    'Maximum 10,000 active collections per account.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'start', 'delete'])
        .describe('Action to perform on collections.'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID. Required for get, update, start, and delete actions.'),

      // List filters
      searchTerm: z.string().optional().describe('Filter collections by name (list action).'),
      status: z
        .enum(['all', 'idle', 'queued', 'running'])
        .optional()
        .describe('Filter by collection status (list action).'),
      sortBy: z
        .enum(['created_at', 'last_run', 'name', 'priority', 'status'])
        .optional()
        .describe('Sort collections (list action).'),
      sortDirection: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort direction (list action).'),
      page: z.number().optional().describe('Page number (list action).'),
      pageSize: z.number().optional().describe('Results per page, max 1000 (list action).'),

      // Create/Update fields
      name: z.string().optional().describe('Collection name (create/update).'),
      scheduleType: z
        .enum(['daily', 'weekly', 'monthly', 'manual', 'minutes'])
        .optional()
        .describe('Schedule type (create/update).'),
      scheduleHours: z
        .array(z.number())
        .optional()
        .describe('Hours of day to run [0-23] (create/update).'),
      scheduleDaysOfWeek: z
        .array(z.number())
        .optional()
        .describe('Days of week [0=Sunday, 6=Saturday] (create/update, weekly schedule).'),
      scheduleDaysOfMonth: z
        .array(z.number())
        .optional()
        .describe('Days of month [1-31] (create/update, monthly schedule).'),
      scheduleMinutes: z
        .string()
        .optional()
        .describe(
          'Minutes interval, e.g. "every_5_minutes", "every_hour" (create/update, minutes schedule).'
        ),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the collection is enabled for scheduled runs (create/update).'),
      priority: z
        .enum(['highest', 'high', 'normal', 'low', 'lowest'])
        .optional()
        .describe('Collection priority (create/update).'),
      requestsType: z
        .enum(['mixed', 'product', 'reviews', 'search', 'category', 'store_stock'])
        .optional()
        .describe('Type of requests in this collection (create/update).'),
      notificationEmail: z
        .string()
        .optional()
        .describe('Email for completion notifications (create/update).'),
      notificationWebhook: z
        .string()
        .optional()
        .describe('Webhook URL for completion notifications (create/update).'),
      notificationAsJson: z
        .boolean()
        .optional()
        .describe('Include JSON download links in webhook body (create/update).'),
      notificationAsCsv: z
        .boolean()
        .optional()
        .describe('Include CSV download links in webhook body (create/update).'),
      destinationIds: z
        .array(z.string())
        .optional()
        .describe('Cloud storage destination IDs for auto-upload (create/update).')
    })
  )
  .output(
    z.object({
      collection: z
        .any()
        .optional()
        .describe('Collection details (for get, create, update, start actions).'),
      collections: z
        .array(z.any())
        .optional()
        .describe('Array of collections (for list action).'),
      collectionsCount: z
        .number()
        .optional()
        .describe('Total number of collections found (list action).'),
      message: z
        .string()
        .optional()
        .describe('Confirmation message for start/delete actions.'),
      requestInfo: z.any().optional().describe('Request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.searchTerm) params.search_term = ctx.input.searchTerm;
      if (ctx.input.status) params.status = ctx.input.status;
      if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
      if (ctx.input.sortDirection) params.sort_direction = ctx.input.sortDirection;
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.pageSize) params.page_size = ctx.input.pageSize;

      let data = await client.listCollections(params);
      let count = data.collections?.length ?? 0;

      return {
        output: {
          collections: data.collections ?? [],
          collectionsCount: data.collections_count,
          requestInfo: data.request_info
        },
        message: `Found **${data.collections_count ?? count}** collections.`
      };
    }

    if (ctx.input.action === 'get') {
      let data = await client.getCollection(ctx.input.collectionId!);
      return {
        output: {
          collection: data.collection,
          requestInfo: data.request_info
        },
        message: `Retrieved collection **${data.collection?.name ?? ctx.input.collectionId}** (status: ${data.collection?.status ?? 'unknown'}).`
      };
    }

    if (ctx.input.action === 'create') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.scheduleType) body.schedule_type = ctx.input.scheduleType;
      if (ctx.input.scheduleHours) body.schedule_hours = ctx.input.scheduleHours;
      if (ctx.input.scheduleDaysOfWeek)
        body.schedule_days_of_week = ctx.input.scheduleDaysOfWeek;
      if (ctx.input.scheduleDaysOfMonth)
        body.schedule_days_of_month = ctx.input.scheduleDaysOfMonth;
      if (ctx.input.scheduleMinutes) body.schedule_minutes = ctx.input.scheduleMinutes;
      if (ctx.input.enabled !== undefined) body.enabled = ctx.input.enabled;
      if (ctx.input.priority) body.priority = ctx.input.priority;
      if (ctx.input.requestsType) body.requests_type = ctx.input.requestsType;
      if (ctx.input.notificationEmail) body.notification_email = ctx.input.notificationEmail;
      if (ctx.input.notificationWebhook)
        body.notification_webhook = ctx.input.notificationWebhook;
      if (ctx.input.notificationAsJson !== undefined)
        body.notification_as_json = ctx.input.notificationAsJson;
      if (ctx.input.notificationAsCsv !== undefined)
        body.notification_as_csv = ctx.input.notificationAsCsv;
      if (ctx.input.destinationIds) body.destination_ids = ctx.input.destinationIds;

      let data = await client.createCollection(body);
      return {
        output: {
          collection: data.collection,
          requestInfo: data.request_info
        },
        message: `Created collection **${data.collection?.name ?? 'new collection'}** (ID: ${data.collection?.id ?? 'unknown'}).`
      };
    }

    if (ctx.input.action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.scheduleType) body.schedule_type = ctx.input.scheduleType;
      if (ctx.input.scheduleHours) body.schedule_hours = ctx.input.scheduleHours;
      if (ctx.input.scheduleDaysOfWeek)
        body.schedule_days_of_week = ctx.input.scheduleDaysOfWeek;
      if (ctx.input.scheduleDaysOfMonth)
        body.schedule_days_of_month = ctx.input.scheduleDaysOfMonth;
      if (ctx.input.scheduleMinutes) body.schedule_minutes = ctx.input.scheduleMinutes;
      if (ctx.input.enabled !== undefined) body.enabled = ctx.input.enabled;
      if (ctx.input.priority) body.priority = ctx.input.priority;
      if (ctx.input.requestsType) body.requests_type = ctx.input.requestsType;
      if (ctx.input.notificationEmail) body.notification_email = ctx.input.notificationEmail;
      if (ctx.input.notificationWebhook)
        body.notification_webhook = ctx.input.notificationWebhook;
      if (ctx.input.notificationAsJson !== undefined)
        body.notification_as_json = ctx.input.notificationAsJson;
      if (ctx.input.notificationAsCsv !== undefined)
        body.notification_as_csv = ctx.input.notificationAsCsv;
      if (ctx.input.destinationIds) body.destination_ids = ctx.input.destinationIds;

      let data = await client.updateCollection(ctx.input.collectionId!, body);
      return {
        output: {
          collection: data.collection,
          requestInfo: data.request_info
        },
        message: `Updated collection **${data.collection?.name ?? ctx.input.collectionId}**.`
      };
    }

    if (ctx.input.action === 'start') {
      let data = await client.startCollection(ctx.input.collectionId!);
      return {
        output: {
          collection: data.collection,
          message: data.request_info?.message,
          requestInfo: data.request_info
        },
        message: `Started collection **${ctx.input.collectionId}**. ${data.request_info?.message ?? ''}`
      };
    }

    // delete
    let data = await client.deleteCollection(ctx.input.collectionId!);
    return {
      output: {
        message: data.request_info?.message,
        requestInfo: data.request_info
      },
      message: `Deleted collection **${ctx.input.collectionId}**.`
    };
  })
  .build();
