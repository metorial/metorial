import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let manageActions = SlateTool.create(spec, {
  name: 'Manage Pipeline Actions',
  key: 'manage_actions',
  description: `List, describe, trigger, pause, or delete pipeline actions. Actions enable event-based pipeline execution via GitHub webhooks or Tower launch hooks. Triggering an action launches its pre-configured pipeline.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'describe', 'trigger', 'pause', 'delete'])
        .describe('Operation to perform'),
      actionId: z
        .string()
        .optional()
        .describe('Action ID (required for describe, trigger, pause, delete)'),
      triggerParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional parameters to pass when triggering an action')
    })
  )
  .output(
    z.object({
      actions: z
        .array(
          z.object({
            actionId: z.string().optional(),
            name: z.string().optional(),
            pipeline: z.string().optional(),
            source: z.string().optional(),
            status: z.string().optional(),
            endpoint: z.string().optional(),
            dateCreated: z.string().optional(),
            lastSeen: z.string().optional()
          })
        )
        .optional()
        .describe('List of actions (for list)'),
      actionId: z.string().optional().describe('Action ID'),
      name: z.string().optional().describe('Action name'),
      pipeline: z.string().optional().describe('Associated pipeline'),
      source: z.string().optional().describe('Event source type'),
      status: z.string().optional().describe('Action status'),
      endpoint: z.string().optional().describe('Webhook endpoint URL'),
      workflowId: z.string().optional().describe('Launched workflow ID (for trigger)'),
      deleted: z.boolean().optional().describe('Whether the action was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.action === 'list') {
      let actions = await client.listActions();
      return {
        output: {
          actions: actions.map(a => ({
            actionId: a.id,
            name: a.name,
            pipeline: a.pipeline,
            source: a.source,
            status: a.status,
            endpoint: a.endpoint,
            dateCreated: a.dateCreated,
            lastSeen: a.lastSeen
          }))
        },
        message: `Found **${actions.length}** pipeline actions.`
      };
    }

    if (!ctx.input.actionId) throw new Error('actionId is required for this operation');

    if (ctx.input.action === 'trigger') {
      let workflowId = await client.triggerAction(ctx.input.actionId, ctx.input.triggerParams);
      return {
        output: { actionId: ctx.input.actionId, workflowId },
        message: `Action **${ctx.input.actionId}** triggered. Workflow ID: **${workflowId}**.`
      };
    }

    if (ctx.input.action === 'pause') {
      await client.pauseAction(ctx.input.actionId);
      return {
        output: { actionId: ctx.input.actionId },
        message: `Action **${ctx.input.actionId}** paused/resumed.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteAction(ctx.input.actionId);
      return {
        output: { actionId: ctx.input.actionId, deleted: true },
        message: `Action **${ctx.input.actionId}** deleted.`
      };
    }

    // describe
    let actionDetail = await client.describeAction(ctx.input.actionId);
    return {
      output: {
        actionId: actionDetail.id,
        name: actionDetail.name,
        pipeline: actionDetail.pipeline,
        source: actionDetail.source,
        status: actionDetail.status,
        endpoint: actionDetail.endpoint
      },
      message: `Action **${actionDetail.name || ctx.input.actionId}** — Source: **${actionDetail.source || 'unknown'}**, Status: **${actionDetail.status || 'unknown'}**.`
    };
  })
  .build();
