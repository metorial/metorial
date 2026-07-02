import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskCompleted = SlateTrigger.create(spec, {
  name: 'Task Completed',
  key: 'task_completed',
  description:
    'Triggers when a robot task finishes, either successfully or with an error. Includes the extracted data, status, and metadata.'
})
  .input(
    z.object({
      event: z.string().describe('The event type that fired'),
      taskId: z.string().describe('ID of the completed task'),
      robotId: z.string().describe('ID of the robot that ran the task'),
      status: z.string().describe('Task status (e.g., "successful", "failed")'),
      capturedTexts: z.record(z.string(), z.any()).optional().describe('Extracted text data'),
      capturedScreenshots: z
        .record(z.string(), z.any())
        .optional()
        .describe('Captured screenshots'),
      finishedAt: z.number().optional().describe('Unix timestamp when the task finished'),
      runByTaskMonitorId: z
        .string()
        .optional()
        .describe('Monitor ID if triggered by monitoring'),
      runByAPI: z.boolean().optional().describe('Whether the task was triggered via API'),
      userFriendlyError: z.string().optional().describe('Error message if task failed'),
      inputParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input parameters used for the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      robotId: z.string().describe('ID of the robot that ran the task'),
      status: z.string().describe('Task status'),
      capturedTexts: z
        .record(z.string(), z.any())
        .optional()
        .describe('Extracted text data as key-value pairs'),
      capturedScreenshots: z
        .record(z.string(), z.any())
        .optional()
        .describe('Captured screenshots'),
      finishedAt: z.number().optional().describe('Unix timestamp when the task finished'),
      runByTaskMonitorId: z
        .string()
        .optional()
        .describe('Monitor ID if triggered by monitoring'),
      runByAPI: z.boolean().optional().describe('Whether the task was triggered via API'),
      userFriendlyError: z.string().optional().describe('Error message if task failed'),
      inputParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input parameters used for the task')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let task = data.task ?? {};

      return {
        inputs: [
          {
            event: data.event ?? 'taskFinished',
            taskId: task.id ?? data.taskId ?? '',
            robotId: task.robotId ?? data.robotId ?? '',
            status: task.status ?? data.status ?? '',
            capturedTexts: task.capturedTexts,
            capturedScreenshots: task.capturedScreenshots,
            finishedAt: task.finishedAt,
            runByTaskMonitorId: task.runByTaskMonitorId,
            runByAPI: task.runByAPI,
            userFriendlyError: task.userFriendlyError,
            inputParameters: task.inputParameters
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event;
      let type = 'task.finished';
      if (eventType === 'taskFinishedSuccessfully') {
        type = 'task.finished_successfully';
      } else if (eventType === 'taskFinishedWithError') {
        type = 'task.finished_with_error';
      }

      return {
        type,
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          robotId: ctx.input.robotId,
          status: ctx.input.status,
          capturedTexts: ctx.input.capturedTexts,
          capturedScreenshots: ctx.input.capturedScreenshots,
          finishedAt: ctx.input.finishedAt,
          runByTaskMonitorId: ctx.input.runByTaskMonitorId,
          runByAPI: ctx.input.runByAPI,
          userFriendlyError: ctx.input.userFriendlyError,
          inputParameters: ctx.input.inputParameters
        }
      };
    }
  })
  .build();
