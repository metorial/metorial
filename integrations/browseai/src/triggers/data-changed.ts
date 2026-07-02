import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let dataChanged = SlateTrigger.create(spec, {
  name: 'Captured Data Changed',
  key: 'data_changed',
  description:
    'Triggers when a monitoring run detects that previously captured data has changed. Includes the updated fields and a list of which specific fields changed.'
})
  .input(
    z.object({
      event: z.string().describe('The event type'),
      taskId: z.string().describe('ID of the monitoring task'),
      robotId: z.string().describe('ID of the robot'),
      status: z.string().describe('Task status'),
      capturedTexts: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated captured text data'),
      changedFields: z.array(z.string()).optional().describe('Names of fields that changed'),
      finishedAt: z.number().optional().describe('Unix timestamp when the task finished'),
      runByTaskMonitorId: z.string().optional().describe('Monitor ID that triggered the run'),
      inputParameters: z
        .record(z.string(), z.any())
        .optional()
        .describe('Input parameters used for the task')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the monitoring task'),
      robotId: z.string().describe('ID of the robot'),
      capturedTexts: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated captured text data'),
      changedFields: z.array(z.string()).optional().describe('Names of fields that changed'),
      finishedAt: z.number().optional().describe('Unix timestamp when the task finished'),
      runByTaskMonitorId: z.string().optional().describe('Monitor ID that triggered the run'),
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
            event: data.event ?? 'taskCapturedDataChanged',
            taskId: task.id ?? data.taskId ?? '',
            robotId: task.robotId ?? data.robotId ?? '',
            status: task.status ?? 'successful',
            capturedTexts: task.capturedTexts,
            changedFields: task.changedFields ?? data.changedFields,
            finishedAt: task.finishedAt,
            runByTaskMonitorId: task.runByTaskMonitorId,
            inputParameters: task.inputParameters
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'task.data_changed',
        id: ctx.input.taskId,
        output: {
          taskId: ctx.input.taskId,
          robotId: ctx.input.robotId,
          capturedTexts: ctx.input.capturedTexts,
          changedFields: ctx.input.changedFields,
          finishedAt: ctx.input.finishedAt,
          runByTaskMonitorId: ctx.input.runByTaskMonitorId,
          inputParameters: ctx.input.inputParameters
        }
      };
    }
  })
  .build();
