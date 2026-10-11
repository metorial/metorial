import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { helpscoutServiceError } from '../lib/errors';
import { halPageInfo } from '../lib/pagination';
import { spec } from '../spec';

export let manageWorkflow = SlateTool.create(spec, {
  name: 'Manage Workflow',
  key: 'manage_workflow',
  description: `List, activate, deactivate, or manually run workflows (automation rules). Workflows automate common actions on conversations.`,
  instructions: [
    'Only manual workflows can be run. All conversations must belong to the same mailbox as the workflow, and at most 50 conversation IDs can be sent at once.'
  ]
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
        .describe('Conversation IDs to run the workflow on (required for run action, max 50)'),
      mailboxId: z.number().optional().describe('Filter the list by mailbox ID'),
      type: z
        .enum(['manual', 'automatic'])
        .optional()
        .describe('Filter the list by workflow type'),
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
      totalCount: z.number().optional().describe('Total workflows (list)'),
      currentPage: z.number().optional().describe('Current page (list)'),
      totalPages: z.number().optional().describe('Total pages (list)'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let data = await client.listWorkflows({
        page: ctx.input.page,
        mailboxId: ctx.input.mailboxId,
        type: ctx.input.type
      });
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

      let page = halPageInfo(data, workflows.length);

      return {
        output: { workflows, ...page, success: true },
        message: `Found **${page.totalCount}** workflows (page ${page.currentPage} of ${page.totalPages}).`
      };
    }

    if (ctx.input.action === 'activate') {
      if (!ctx.input.workflowId) throw helpscoutServiceError('Workflow ID is required');
      await client.updateWorkflowStatus(ctx.input.workflowId, 'active');
      return {
        output: { success: true },
        message: `Activated workflow **#${ctx.input.workflowId}**.`
      };
    }

    if (ctx.input.action === 'deactivate') {
      if (!ctx.input.workflowId) throw helpscoutServiceError('Workflow ID is required');
      await client.updateWorkflowStatus(ctx.input.workflowId, 'inactive');
      return {
        output: { success: true },
        message: `Deactivated workflow **#${ctx.input.workflowId}**.`
      };
    }

    if (ctx.input.action === 'run') {
      if (!ctx.input.workflowId) throw helpscoutServiceError('Workflow ID is required');
      if (!ctx.input.conversationIds?.length)
        throw helpscoutServiceError('Conversation IDs are required');
      if (ctx.input.conversationIds.length > 50)
        throw helpscoutServiceError(
          'A workflow can be run on at most 50 conversations per request. Split the IDs into smaller batches.'
        );
      await client.runWorkflowOnConversations(ctx.input.workflowId, ctx.input.conversationIds);
      return {
        output: { success: true },
        message: `Ran workflow **#${ctx.input.workflowId}** on ${ctx.input.conversationIds.length} conversation(s).`
      };
    }

    throw helpscoutServiceError(`Unsupported workflow action: ${ctx.input.action}`);
  })
  .build();
