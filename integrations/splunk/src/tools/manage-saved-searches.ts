import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

let namespaceSchema = z
  .object({
    owner: z.string().optional().describe('Namespace owner (username)'),
    app: z.string().optional().describe('Namespace app context')
  })
  .optional()
  .describe('Optional app/owner namespace context');

export let listSavedSearches = SlateTool.create(spec, {
  name: 'List Saved Searches',
  key: 'list_saved_searches',
  description: `List saved searches configured on the Splunk instance. Returns search name, query, schedule, and alert configuration. Supports filtering and pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of results to return (default 30)'),
      offset: z.number().optional().describe('Offset for pagination (default 0)'),
      searchFilter: z
        .string()
        .optional()
        .describe('Filter string to match saved search names'),
      namespace: namespaceSchema
    })
  )
  .output(
    z.object({
      savedSearches: z.array(
        z.object({
          name: z.string().optional(),
          searchQuery: z.string().optional(),
          description: z.string().optional(),
          isScheduled: z.any().optional(),
          cronSchedule: z.string().optional(),
          earliestTime: z.string().optional(),
          latestTime: z.string().optional(),
          disabled: z.any().optional(),
          alertType: z.string().optional(),
          alertComparator: z.string().optional(),
          alertThreshold: z.string().optional(),
          alertCondition: z.string().optional(),
          alertActions: z.string().optional(),
          owner: z.string().optional(),
          app: z.string().optional()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.listSavedSearches({
      count: ctx.input.count,
      offset: ctx.input.offset,
      searchFilter: ctx.input.searchFilter,
      namespace: ctx.input.namespace
    });

    return {
      output: response,
      message: `Found **${response.total}** saved searches. Returned **${response.savedSearches.length}**.`
    };
  })
  .build();

export let createSavedSearch = SlateTool.create(spec, {
  name: 'Create Saved Search',
  key: 'create_saved_search',
  description: `Create a new saved search in Splunk. Optionally configure it as a scheduled search with a cron schedule, and/or set up alert actions including webhook notifications.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the saved search'),
      searchQuery: z.string().describe('SPL search query'),
      description: z.string().optional().describe('Description of the saved search'),
      isScheduled: z.boolean().optional().describe('Whether the search should be scheduled'),
      cronSchedule: z
        .string()
        .optional()
        .describe('Cron schedule expression (e.g. "*/5 * * * *")'),
      earliestTime: z.string().optional().describe('Dispatch earliest time'),
      latestTime: z.string().optional().describe('Dispatch latest time'),
      disabled: z.boolean().optional().describe('Whether the saved search is disabled'),
      alertType: z
        .string()
        .optional()
        .describe('Alert trigger type, such as "always", "number of events", or "custom"'),
      alertComparator: z
        .string()
        .optional()
        .describe('Alert comparator, such as "greater than", "less than", or "equal to"'),
      alertThreshold: z.string().optional().describe('Alert threshold value'),
      alertCondition: z
        .string()
        .optional()
        .describe('Custom alert condition SPL expression used when alertType is "custom"'),
      alertActions: z
        .string()
        .optional()
        .describe('Comma-separated alert actions (e.g. "email,webhook")'),
      webhookUrl: z.string().optional().describe('Webhook URL for alert notifications'),
      namespace: namespaceSchema
    })
  )
  .output(
    z.object({
      name: z.string().optional(),
      searchQuery: z.string().optional(),
      description: z.string().optional(),
      isScheduled: z.any().optional(),
      cronSchedule: z.string().optional(),
      alertType: z.string().optional(),
      alertComparator: z.string().optional(),
      alertThreshold: z.string().optional(),
      alertCondition: z.string().optional(),
      alertActions: z.string().optional(),
      owner: z.string().optional(),
      app: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.createSavedSearch({
      name: ctx.input.name,
      searchQuery: ctx.input.searchQuery,
      description: ctx.input.description,
      isScheduled: ctx.input.isScheduled,
      cronSchedule: ctx.input.cronSchedule,
      earliestTime: ctx.input.earliestTime,
      latestTime: ctx.input.latestTime,
      disabled: ctx.input.disabled,
      alertType: ctx.input.alertType,
      alertComparator: ctx.input.alertComparator,
      alertThreshold: ctx.input.alertThreshold,
      alertCondition: ctx.input.alertCondition,
      alertActions: ctx.input.alertActions,
      webhookUrl: ctx.input.webhookUrl,
      namespace: ctx.input.namespace
    });

    return {
      output: result,
      message: `Saved search **${ctx.input.name}** created successfully.`
    };
  })
  .build();

export let updateSavedSearch = SlateTool.create(spec, {
  name: 'Update Saved Search',
  key: 'update_saved_search',
  description: `Update an existing saved search in Splunk. Modify its query, schedule, description, alert configuration, or webhook URL.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the saved search to update'),
      searchQuery: z.string().optional().describe('Updated SPL search query'),
      description: z.string().optional().describe('Updated description'),
      isScheduled: z.boolean().optional().describe('Whether the search should be scheduled'),
      cronSchedule: z.string().optional().describe('Updated cron schedule expression'),
      earliestTime: z.string().optional().describe('Updated dispatch earliest time'),
      latestTime: z.string().optional().describe('Updated dispatch latest time'),
      disabled: z.boolean().optional().describe('Whether the saved search should be disabled'),
      alertType: z.string().optional().describe('Updated alert trigger type'),
      alertComparator: z.string().optional().describe('Updated alert comparator'),
      alertThreshold: z.string().optional().describe('Updated alert threshold value'),
      alertCondition: z.string().optional().describe('Updated custom alert condition'),
      alertActions: z.string().optional().describe('Comma-separated alert actions'),
      webhookUrl: z.string().optional().describe('Updated webhook URL for alerts'),
      namespace: namespaceSchema
    })
  )
  .output(
    z.object({
      name: z.string().optional(),
      searchQuery: z.string().optional(),
      description: z.string().optional(),
      isScheduled: z.any().optional(),
      cronSchedule: z.string().optional(),
      alertType: z.string().optional(),
      alertComparator: z.string().optional(),
      alertThreshold: z.string().optional(),
      alertCondition: z.string().optional(),
      alertActions: z.string().optional(),
      owner: z.string().optional(),
      app: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.updateSavedSearch(ctx.input.name, {
      searchQuery: ctx.input.searchQuery,
      description: ctx.input.description,
      isScheduled: ctx.input.isScheduled,
      cronSchedule: ctx.input.cronSchedule,
      earliestTime: ctx.input.earliestTime,
      latestTime: ctx.input.latestTime,
      disabled: ctx.input.disabled,
      alertType: ctx.input.alertType,
      alertComparator: ctx.input.alertComparator,
      alertThreshold: ctx.input.alertThreshold,
      alertCondition: ctx.input.alertCondition,
      alertActions: ctx.input.alertActions,
      webhookUrl: ctx.input.webhookUrl,
      namespace: ctx.input.namespace
    });

    return {
      output: result,
      message: `Saved search **${ctx.input.name}** updated successfully.`
    };
  })
  .build();

export let deleteSavedSearch = SlateTool.create(spec, {
  name: 'Delete Saved Search',
  key: 'delete_saved_search',
  description: `Delete a saved search from the Splunk instance by name.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      name: z.string().describe('Name of the saved search to delete'),
      namespace: namespaceSchema
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    await client.deleteSavedSearch(ctx.input.name, ctx.input.namespace);

    return {
      output: { deleted: true },
      message: `Saved search **${ctx.input.name}** deleted successfully.`
    };
  })
  .build();

export let dispatchSavedSearch = SlateTool.create(spec, {
  name: 'Dispatch Saved Search',
  key: 'dispatch_saved_search',
  description: `Execute (dispatch) an existing saved search. Returns a search job ID that can be used to retrieve results. Optionally override the time range and trigger alert actions.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name of the saved search to dispatch'),
      earliestTime: z.string().optional().describe('Override dispatch earliest time'),
      latestTime: z.string().optional().describe('Override dispatch latest time'),
      triggerActions: z.boolean().optional().describe('Whether to trigger alert actions'),
      forceDispatch: z
        .boolean()
        .optional()
        .describe('Force dispatch even if another instance is running'),
      namespace: namespaceSchema
    })
  )
  .output(
    z.object({
      searchId: z.string().describe('Search job ID of the dispatched search')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.dispatchSavedSearch(ctx.input.name, {
      earliestTime: ctx.input.earliestTime,
      latestTime: ctx.input.latestTime,
      triggerActions: ctx.input.triggerActions,
      forceDispatch: ctx.input.forceDispatch,
      namespace: ctx.input.namespace
    });

    return {
      output: result,
      message: `Saved search **${ctx.input.name}** dispatched. Job ID: **${result.searchId}**.`
    };
  })
  .build();
