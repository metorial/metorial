import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let parameterSchema = z.object({
  type: z.string().optional().describe('Parameter type'),
  key: z.string().optional().describe('Parameter key'),
  value: z.string().optional().describe('Parameter value'),
  list: z.array(z.any()).optional().describe('List parameter values'),
  map: z.array(z.any()).optional().describe('Map parameter values')
});

let conditionSchema = z.object({
  type: z
    .string()
    .optional()
    .describe('Condition type (e.g., "equals", "contains", "startsWith", "matchRegex")'),
  parameter: z.array(parameterSchema).optional().describe('Condition parameters')
});

let triggerOutputSchema = z.object({
  triggerId: z.string().optional().describe('Trigger ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  workspaceId: z.string().optional().describe('Parent workspace ID'),
  name: z.string().optional().describe('Trigger name'),
  type: z.string().optional().describe('Trigger type'),
  customEventFilter: z
    .array(conditionSchema)
    .optional()
    .describe('Custom event filter conditions'),
  filter: z.array(conditionSchema).optional().describe('Filter conditions'),
  autoEventFilter: z
    .array(conditionSchema)
    .optional()
    .describe('Auto-event filter conditions'),
  notes: z.string().optional().describe('Trigger notes'),
  fingerprint: z.string().optional().describe('Trigger fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI'),
  parentFolderId: z.string().optional().describe('Parent folder ID')
});

export let manageTrigger = SlateTool.create(spec, {
  name: 'Manage Trigger',
  key: 'manage_trigger',
  description: `Create, list, get, update, or delete triggers in a GTM workspace. Triggers define when tags should fire based on events like pageviews, clicks, form submissions, and custom events.`,
  instructions: [
    'Common trigger types: "pageview" (Page View), "click" (Click), "linkClick" (Link Click), "formSubmission" (Form Submission), "customEvent" (Custom Event), "historyChange" (History Change), "jsError" (JS Error), "timer" (Timer), "scrollDepth" (Scroll Depth), "elementVisibility" (Element Visibility).',
    'Filters use conditions to narrow when the trigger fires. Each condition has a type and parameters.',
    'The "revert" action undoes workspace changes to a specific trigger.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageTrigger)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().describe('GTM workspace ID'),
      triggerId: z
        .string()
        .optional()
        .describe('Trigger ID (required for get, update, delete)'),
      name: z.string().optional().describe('Trigger name (required for create)'),
      type: z.string().optional().describe('Trigger type (required for create)'),
      customEventFilter: z
        .array(conditionSchema)
        .optional()
        .describe('Custom event filter conditions'),
      filter: z.array(conditionSchema).optional().describe('General filter conditions'),
      autoEventFilter: z
        .array(conditionSchema)
        .optional()
        .describe('Auto-event filter conditions'),
      parameter: z.array(parameterSchema).optional().describe('Additional trigger parameters'),
      notes: z.string().optional().describe('Trigger notes'),
      parentFolderId: z.string().optional().describe('Folder ID to organize this trigger in')
    })
  )
  .output(
    z.object({
      trigger: triggerOutputSchema
        .optional()
        .describe('Trigger details (for single-trigger operations)'),
      triggers: z
        .array(triggerOutputSchema)
        .optional()
        .describe('List of triggers (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, workspaceId, triggerId } = ctx.input;

    if (action === 'list') {
      let response = await client.listTriggers(accountId, containerId, workspaceId);
      let triggers = response.trigger || [];
      return {
        output: { triggers } as any,
        message: `Found **${triggers.length}** trigger(s) in workspace \`${workspaceId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a trigger');
      if (!ctx.input.type) throw new Error('Type is required for creating a trigger');

      let triggerData: Record<string, unknown> = {
        name: ctx.input.name,
        type: ctx.input.type
      };
      if (ctx.input.customEventFilter)
        triggerData.customEventFilter = ctx.input.customEventFilter;
      if (ctx.input.filter) triggerData.filter = ctx.input.filter;
      if (ctx.input.autoEventFilter) triggerData.autoEventFilter = ctx.input.autoEventFilter;
      if (ctx.input.parameter) triggerData.parameter = ctx.input.parameter;
      if (ctx.input.notes) triggerData.notes = ctx.input.notes;
      if (ctx.input.parentFolderId) triggerData.parentFolderId = ctx.input.parentFolderId;

      let trigger = await client.createTrigger(
        accountId,
        containerId,
        workspaceId,
        triggerData
      );
      return {
        output: { trigger } as any,
        message: `Created trigger **"${trigger.name}"** (ID: \`${trigger.triggerId}\`, type: \`${trigger.type}\`)`
      };
    }

    if (!triggerId)
      throw new Error('triggerId is required for get, update, and delete actions');

    if (action === 'get') {
      let trigger = await client.getTrigger(accountId, containerId, workspaceId, triggerId);
      return {
        output: { trigger } as any,
        message: `Retrieved trigger **"${trigger.name}"** (type: \`${trigger.type}\`)`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.type !== undefined) updateData.type = ctx.input.type;
      if (ctx.input.customEventFilter !== undefined)
        updateData.customEventFilter = ctx.input.customEventFilter;
      if (ctx.input.filter !== undefined) updateData.filter = ctx.input.filter;
      if (ctx.input.autoEventFilter !== undefined)
        updateData.autoEventFilter = ctx.input.autoEventFilter;
      if (ctx.input.parameter !== undefined) updateData.parameter = ctx.input.parameter;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
      if (ctx.input.parentFolderId !== undefined)
        updateData.parentFolderId = ctx.input.parentFolderId;

      let trigger = await client.updateTrigger(
        accountId,
        containerId,
        workspaceId,
        triggerId,
        updateData
      );
      return {
        output: { trigger } as any,
        message: `Updated trigger **"${trigger.name}"** (ID: \`${trigger.triggerId}\`)`
      };
    }

    // delete
    await client.deleteTrigger(accountId, containerId, workspaceId, triggerId);
    return {
      output: { trigger: { triggerId, accountId, containerId, workspaceId } } as any,
      message: `Deleted trigger \`${triggerId}\``
    };
  })
  .build();
