import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TaskRouterClient } from '../lib/taskrouter-client';
import { spec } from '../spec';

export let taskEventsTrigger = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    '[Polling fallback] Polls for new or updated tasks in a TaskRouter workspace. Detects task creation, assignment, completion, and cancellation.'
})
  .input(
    z.object({
      taskSid: z.string().describe('Task SID'),
      assignmentStatus: z.string().describe('Current assignment status'),
      previousStatus: z.string().optional().describe('Previous assignment status'),
      attributes: z.string().optional().describe('Task attributes as JSON string'),
      priority: z.number().optional().describe('Task priority'),
      taskQueueFriendlyName: z.string().optional().describe('Task queue friendly name'),
      workerName: z.string().optional().describe('Assigned worker name'),
      workflowFriendlyName: z.string().optional().describe('Workflow friendly name'),
      age: z.number().optional().describe('Task age in seconds'),
      dateCreated: z.string().optional().describe('Date created'),
      dateUpdated: z.string().optional().describe('Date last updated')
    })
  )
  .output(
    z.object({
      taskSid: z.string().describe('Task SID'),
      assignmentStatus: z.string().describe('Current assignment status'),
      attributes: z.string().optional().describe('Task attributes as JSON string'),
      priority: z.number().optional().describe('Task priority'),
      taskQueueFriendlyName: z.string().optional().describe('Task queue friendly name'),
      workerName: z.string().optional().describe('Assigned worker name'),
      workflowFriendlyName: z.string().optional().describe('Workflow friendly name'),
      age: z.number().optional().describe('Task age in seconds'),
      dateCreated: z.string().optional().describe('Date created'),
      dateUpdated: z.string().optional().describe('Date last updated')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let workspaceSid = ctx.config.workspaceSid;
      if (!workspaceSid) {
        ctx.warn('No workspaceSid configured — cannot poll for task events');
        return { inputs: [] };
      }

      let client = new TaskRouterClient(ctx.auth.token, ctx.auth.accountSid);
      let previousTaskStatuses: Record<string, string> = ctx.state?.taskStatuses || {};

      let result = await client.listTasks(workspaceSid, { PageSize: '100' });
      let tasks: any[] = result.tasks || [];

      let inputs: any[] = [];
      let newTaskStatuses: Record<string, string> = {};

      for (let task of tasks) {
        newTaskStatuses[task.sid] = task.assignment_status;
        let previousStatus = previousTaskStatuses[task.sid];

        if (!previousStatus || previousStatus !== task.assignment_status) {
          inputs.push({
            taskSid: task.sid,
            assignmentStatus: task.assignment_status,
            previousStatus: previousStatus || undefined,
            attributes: task.attributes,
            priority: task.priority,
            taskQueueFriendlyName: task.task_queue_friendly_name,
            workerName: task.worker_name,
            workflowFriendlyName: task.workflow_friendly_name,
            age: task.age,
            dateCreated: task.date_created,
            dateUpdated: task.date_updated
          });
        }
      }

      return {
        inputs,
        updatedState: {
          taskStatuses: newTaskStatuses
        }
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.previousStatus
        ? `task.${ctx.input.assignmentStatus}`
        : 'task.created';

      return {
        type: eventType,
        id: `${ctx.input.taskSid}-${ctx.input.assignmentStatus}-${ctx.input.dateUpdated || Date.now()}`,
        output: {
          taskSid: ctx.input.taskSid,
          assignmentStatus: ctx.input.assignmentStatus,
          attributes: ctx.input.attributes,
          priority: ctx.input.priority,
          taskQueueFriendlyName: ctx.input.taskQueueFriendlyName,
          workerName: ctx.input.workerName,
          workflowFriendlyName: ctx.input.workflowFriendlyName,
          age: ctx.input.age,
          dateCreated: ctx.input.dateCreated,
          dateUpdated: ctx.input.dateUpdated
        }
      };
    }
  })
  .build();
