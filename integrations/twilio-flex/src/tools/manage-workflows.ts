import { SlateTool } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { spec } from '../spec';

let workflowSchema = z.object({
  workflowSid: z.string().describe('Workflow SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  configuration: z.string().optional().describe('Workflow configuration as JSON string'),
  assignmentCallbackUrl: z.string().optional().describe('Assignment callback URL'),
  fallbackAssignmentCallbackUrl: z
    .string()
    .optional()
    .describe('Fallback assignment callback URL'),
  taskReservationTimeout: z
    .number()
    .optional()
    .describe('Task reservation timeout in seconds'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date last updated')
});

export let manageWorkflowsTool = SlateTool.create(spec, {
  name: 'Manage Workflows',
  key: 'manage_workflows',
  description: `Create, read, update, delete, or list workflows in a TaskRouter workspace. Workflows define the routing rules that determine how tasks are assigned to workers based on task attributes and queue configurations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      workspaceSid: z.string().describe('Workspace SID'),
      workflowSid: z
        .string()
        .optional()
        .describe('Workflow SID (required for get/update/delete)'),
      friendlyName: z.string().optional().describe('Friendly name'),
      configuration: z.string().optional().describe('Workflow configuration as JSON string'),
      assignmentCallbackUrl: z.string().optional().describe('Assignment callback URL'),
      fallbackAssignmentCallbackUrl: z
        .string()
        .optional()
        .describe('Fallback assignment callback URL'),
      taskReservationTimeout: z
        .number()
        .optional()
        .describe('Task reservation timeout in seconds'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      workflows: z.array(workflowSchema).describe('Workflow records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TaskRouterClient(ctx.auth.token, ctx.auth.accountSid);

    if (ctx.input.action === 'list') {
      let result = await client.listWorkflows(ctx.input.workspaceSid, ctx.input.pageSize);
      let workflows = (result.workflows || []).map((w: any) => ({
        workflowSid: w.sid,
        friendlyName: w.friendly_name,
        configuration: w.configuration,
        assignmentCallbackUrl: w.assignment_callback_url,
        fallbackAssignmentCallbackUrl: w.fallback_assignment_callback_url,
        taskReservationTimeout: w.task_reservation_timeout,
        dateCreated: w.date_created,
        dateUpdated: w.date_updated
      }));
      return {
        output: { workflows },
        message: `Found **${workflows.length}** workflows.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.workflowSid) throw new Error('workflowSid is required');
      let w = await client.getWorkflow(ctx.input.workspaceSid, ctx.input.workflowSid);
      return {
        output: {
          workflows: [
            {
              workflowSid: w.sid,
              friendlyName: w.friendly_name,
              configuration: w.configuration,
              assignmentCallbackUrl: w.assignment_callback_url,
              fallbackAssignmentCallbackUrl: w.fallback_assignment_callback_url,
              taskReservationTimeout: w.task_reservation_timeout,
              dateCreated: w.date_created,
              dateUpdated: w.date_updated
            }
          ]
        },
        message: `Workflow **${w.friendly_name}** (${w.sid}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.friendlyName) throw new Error('friendlyName is required');
      if (!ctx.input.configuration) throw new Error('configuration is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        Configuration: ctx.input.configuration,
        AssignmentCallbackUrl: ctx.input.assignmentCallbackUrl,
        FallbackAssignmentCallbackUrl: ctx.input.fallbackAssignmentCallbackUrl,
        TaskReservationTimeout: ctx.input.taskReservationTimeout?.toString()
      };
      let w = await client.createWorkflow(ctx.input.workspaceSid, params);
      return {
        output: {
          workflows: [
            {
              workflowSid: w.sid,
              friendlyName: w.friendly_name,
              configuration: w.configuration,
              assignmentCallbackUrl: w.assignment_callback_url,
              fallbackAssignmentCallbackUrl: w.fallback_assignment_callback_url,
              taskReservationTimeout: w.task_reservation_timeout,
              dateCreated: w.date_created,
              dateUpdated: w.date_updated
            }
          ]
        },
        message: `Created workflow **${w.friendly_name}** (${w.sid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.workflowSid) throw new Error('workflowSid is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        Configuration: ctx.input.configuration,
        AssignmentCallbackUrl: ctx.input.assignmentCallbackUrl,
        FallbackAssignmentCallbackUrl: ctx.input.fallbackAssignmentCallbackUrl,
        TaskReservationTimeout: ctx.input.taskReservationTimeout?.toString()
      };
      let w = await client.updateWorkflow(
        ctx.input.workspaceSid,
        ctx.input.workflowSid,
        params
      );
      return {
        output: {
          workflows: [
            {
              workflowSid: w.sid,
              friendlyName: w.friendly_name,
              configuration: w.configuration,
              assignmentCallbackUrl: w.assignment_callback_url,
              fallbackAssignmentCallbackUrl: w.fallback_assignment_callback_url,
              taskReservationTimeout: w.task_reservation_timeout,
              dateCreated: w.date_created,
              dateUpdated: w.date_updated
            }
          ]
        },
        message: `Updated workflow **${w.friendly_name}** (${w.sid}).`
      };
    }

    // delete
    if (!ctx.input.workflowSid) throw new Error('workflowSid is required');
    await client.deleteWorkflow(ctx.input.workspaceSid, ctx.input.workflowSid);
    return {
      output: {
        workflows: [
          {
            workflowSid: ctx.input.workflowSid
          }
        ]
      },
      message: `Deleted workflow **${ctx.input.workflowSid}**.`
    };
  })
  .build();
