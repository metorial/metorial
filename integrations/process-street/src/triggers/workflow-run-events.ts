import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskDataSchema = z.object({
  taskId: z.string().describe('ID of the task'),
  taskName: z.string().optional().describe('Name of the task'),
  taskStatus: z.string().optional().describe('Status of the task (NotCompleted, Completed)'),
  hidden: z.boolean().optional().describe('Whether the task is hidden'),
  stopped: z.boolean().optional().describe('Whether the task is stopped')
});

let workflowRunDataSchema = z.object({
  workflowRunId: z.string().optional().describe('ID of the workflow run'),
  workflowRunName: z.string().optional().describe('Name of the workflow run'),
  workflowId: z.string().optional().describe('ID of the parent workflow'),
  workflowName: z.string().optional().describe('Name of the parent workflow')
});

export let workflowRunEvents = SlateTrigger.create(spec, {
  name: 'Workflow Run Events',
  key: 'workflow_run_events',
  description:
    'Triggers on workflow run lifecycle events including run creation, completion, task checked/unchecked, task ready/not ready, task approved/rejected, and task overdue.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the event'),
      eventId: z.string().describe('Unique ID for this event'),
      createdDate: z.string().optional().describe('Date the event was created'),
      payload: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of event that occurred'),
      task: taskDataSchema.optional().describe('Task data if the event is task-related'),
      workflowRun: workflowRunDataSchema.optional().describe('Workflow run data'),
      approvalStatus: z
        .string()
        .optional()
        .describe('Approval status (Approved/Rejected) for approval events'),
      approvalComment: z.string().optional().describe('Comment left on the approval'),
      reviewerEmail: z
        .string()
        .optional()
        .describe('Email of the reviewer for approval events'),
      reviewerUsername: z
        .string()
        .optional()
        .describe('Username of the reviewer for approval events')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        triggers: [
          'TaskCheckedUnchecked',
          'TaskReady',
          'WorkflowRunCreated',
          'WorkflowRunCompleted'
        ]
      });

      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Process Street may send a single event
      let eventType = data.type || 'unknown';
      let eventId = data.id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            createdDate: data.createdDate,
            payload: data.data || data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, payload } = ctx.input;

      let typeMap: Record<string, string> = {
        TaskCheckedUnchecked: 'task.checked_unchecked',
        ChecklistCreated: 'workflow_run.created',
        WorkflowRunCreated: 'workflow_run.created',
        ChecklistCompleted: 'workflow_run.completed',
        WorkflowRunCompleted: 'workflow_run.completed',
        TaskReady: 'task.ready',
        TaskNotReady: 'task.not_ready',
        TaskApproved: 'task.approved',
        TaskRejected: 'task.rejected',
        TaskOverdue: 'task.overdue'
      };

      let normalizedType = typeMap[eventType] || eventType.toLowerCase();

      let task: any;
      let workflowRun: any;
      let approvalStatus: string | undefined;
      let approvalComment: string | undefined;
      let reviewerEmail: string | undefined;
      let reviewerUsername: string | undefined;

      // Task events have task data in payload
      if (payload?.id && payload?.name !== undefined && payload?.status !== undefined) {
        task = {
          taskId: payload.id,
          taskName: payload.name,
          taskStatus: payload.status,
          hidden: payload.hidden,
          stopped: payload.stopped
        };
      }

      // Task in nested structure (approval events)
      if (payload?.task) {
        task = {
          taskId: payload.task.id,
          taskName: payload.task.name,
          taskStatus: payload.task.status,
          hidden: payload.task.hidden,
          stopped: payload.task.stopped
        };
      }

      // Workflow run created events have full run data
      if (payload?.template || payload?.tasks) {
        workflowRun = {
          workflowRunId: payload.id,
          workflowRunName: payload.name,
          workflowId: payload.template?.id,
          workflowName: payload.template?.name
        };
      }

      // Approval events
      if (payload?.status === 'Approved' || payload?.status === 'Rejected') {
        approvalStatus = payload.status;
        approvalComment = payload.comment;
        reviewerEmail = payload.reviewedBy?.email;
        reviewerUsername = payload.reviewedBy?.username;
      }

      return {
        type: normalizedType,
        id: eventId,
        output: {
          eventType: normalizedType,
          task,
          workflowRun,
          approvalStatus,
          approvalComment,
          reviewerEmail,
          reviewerUsername
        }
      };
    }
  })
  .build();
