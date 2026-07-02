import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `List, activate, deactivate, or manually run workflows (automation rules). Workflows automate common actions on conversations.`
})
  .input(
    z.object({
      action: z.enum(['list', 'activate', 'deactivate', 'run']).describe('Action to perform'),
      workflowId: z
        .number()
        .optional()
        .describe('Workflow ID (required for activate, deactivate, run)'),
      conversationIds: z
        .array(z.number())
        .optional()
        .describe('Conversation IDs to run the workflow on (required for run action)'),
      page: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      workflows: z
        .array(
          z.object({
            workflowId: z.number().describe('Workflow ID'),
            name: z.string().describe('Workflow name'),
            type: z.string().optional().describe('Workflow type'),
            status: z.string().optional().describe('Workflow status (active, inactive)'),
            mailboxId: z.number().optional().describe('Associated mailbox ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            modifiedAt: z.string().optional().describe('Last modified timestamp')
          })
        )
        .optional()
        .describe('List of workflows'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let data = await client.listWorkflows({ page: ctx.input.page });
      let embedded = data?._embedded?.workflows ?? [];
      let workflows = embedded.map((w: any) => ({
        workflowId: w.id,
        name: w.name,
        type: w.type,
        status: w.status,
        mailboxId: w.mailboxId,
        createdAt: w.createdAt,
        modifiedAt: w.modifiedAt
      }));

      return {
        output: { workflows, success: true },
        message: `Found **${workflows.length}** workflows.`
      };
    }

    if (ctx.input.action === 'activate') {
      if (!ctx.input.workflowId) throw new Error('Workflow ID is required');
      await client.activateWorkflow(ctx.input.workflowId);
      return {
        output: { success: true },
        message: `Activated workflow **#${ctx.input.workflowId}**.`
      };
    }

    if (ctx.input.action === 'deactivate') {
      if (!ctx.input.workflowId) throw new Error('Workflow ID is required');
      await client.deactivateWorkflow(ctx.input.workflowId);
      return {
        output: { success: true },
        message: `Deactivated workflow **#${ctx.input.workflowId}**.`
      };
    }

    if (ctx.input.action === 'run') {
      if (!ctx.input.workflowId) throw new Error('Workflow ID is required');
      if (!ctx.input.conversationIds?.length) throw new Error('Conversation IDs are required');
      await client.runWorkflowOnConversations(ctx.input.workflowId, ctx.input.conversationIds);
      return {
        output: { success: true },
        message: `Ran workflow **#${ctx.input.workflowId}** on ${ctx.input.conversationIds.length} conversation(s).`
      };
    }

    return { output: { success: false }, message: 'Unknown action.' };
  })
  .build();
