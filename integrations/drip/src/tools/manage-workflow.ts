import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `List, fetch, activate, or pause automation workflows. Start a subscriber on a workflow or remove them from one. Use this to control Drip's automation engine.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'fetch', 'activate', 'pause', 'start_subscriber', 'remove_subscriber'])
        .describe('The action to perform.'),
      workflowId: z
        .string()
        .optional()
        .describe('Workflow ID. Required for all actions except list.'),
      subscriberEmail: z
        .string()
        .optional()
        .describe('Subscriber email. Required for start_subscriber.'),
      subscriberId: z
        .string()
        .optional()
        .describe('Subscriber ID. Required for remove_subscriber.'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields to set when starting a subscriber.'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to apply when starting a subscriber.'),
      page: z.number().optional().describe('Page number for list.'),
      perPage: z.number().optional().describe('Results per page for list.')
    })
  )
  .output(
    z.object({
      workflows: z
        .array(
          z.object({
            workflowId: z.string(),
            name: z.string().optional(),
            status: z.string().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
        .describe('List of workflows.'),
      workflow: z
        .object({
          workflowId: z.string(),
          name: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional()
        })
        .optional()
        .describe('Workflow details.'),
      activated: z.boolean().optional(),
      paused: z.boolean().optional(),
      started: z.boolean().optional(),
      removed: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.action === 'list') {
      let result = await client.listWorkflows({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let workflows = (result.workflows ?? []).map((w: any) => ({
        workflowId: w.id ?? '',
        name: w.name,
        status: w.status,
        createdAt: w.created_at
      }));
      return {
        output: { workflows },
        message: `Found **${workflows.length}** workflows.`
      };
    }

    if (!ctx.input.workflowId) {
      throw new Error('workflowId is required for this action.');
    }

    if (ctx.input.action === 'fetch') {
      let result = await client.fetchWorkflow(ctx.input.workflowId);
      let w = result.workflows?.[0] ?? {};
      return {
        output: {
          workflow: {
            workflowId: w.id ?? '',
            name: w.name,
            status: w.status,
            createdAt: w.created_at
          }
        },
        message: `Fetched workflow **${w.name}** (${w.status}).`
      };
    }

    if (ctx.input.action === 'activate') {
      await client.activateWorkflow(ctx.input.workflowId);
      return {
        output: { activated: true },
        message: `Workflow **${ctx.input.workflowId}** activated.`
      };
    }

    if (ctx.input.action === 'pause') {
      await client.pauseWorkflow(ctx.input.workflowId);
      return {
        output: { paused: true },
        message: `Workflow **${ctx.input.workflowId}** paused.`
      };
    }

    if (ctx.input.action === 'start_subscriber') {
      if (!ctx.input.subscriberEmail) {
        throw new Error('subscriberEmail is required to start a subscriber on a workflow.');
      }
      let sub: Record<string, any> = { email: ctx.input.subscriberEmail };
      if (ctx.input.customFields) sub.custom_fields = ctx.input.customFields;
      if (ctx.input.tags) sub.tags = ctx.input.tags;
      await client.startOnWorkflow(ctx.input.workflowId, sub);
      return {
        output: { started: true },
        message: `**${ctx.input.subscriberEmail}** started on workflow **${ctx.input.workflowId}**.`
      };
    }

    if (ctx.input.action === 'remove_subscriber') {
      if (!ctx.input.subscriberId) {
        throw new Error('subscriberId is required to remove a subscriber from a workflow.');
      }
      await client.removeFromWorkflow(ctx.input.workflowId, ctx.input.subscriberId);
      return {
        output: { removed: true },
        message: `Subscriber **${ctx.input.subscriberId}** removed from workflow **${ctx.input.workflowId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
