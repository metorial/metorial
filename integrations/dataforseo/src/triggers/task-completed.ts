import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let taskCompleted = SlateTrigger.create(spec, {
  name: 'Task Completed',
  key: 'task_completed',
  description:
    'Triggered when a DataForSEO task completes. Configure the postback_url parameter when creating tasks to receive results via webhook, or use the pingback_url for notifications with task IDs.'
})
  .input(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      taskTag: z.string().optional().describe('Tag associated with the task'),
      isPingback: z
        .boolean()
        .describe('Whether this is a pingback (true) or postback (false)'),
      taskResults: z.any().optional().describe('Full task results (postback only)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('ID of the completed task'),
      taskTag: z.string().optional().describe('Optional tag associated with the task'),
      isPingback: z.boolean().describe('Whether this was a pingback notification'),
      statusCode: z.number().optional().describe('Task status code'),
      statusMessage: z.string().optional().describe('Task status message'),
      resultCount: z.number().optional().describe('Number of results'),
      results: z.array(z.any()).optional().describe('Task results (postback only)'),
      cost: z.number().optional().describe('Task cost')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let method = ctx.request.method;

      // Pingback: GET request with task ID in query/path
      if (method === 'GET') {
        let taskId = url.searchParams.get('id') || url.pathname.split('/').pop() || '';
        let taskTag = url.searchParams.get('tag') || undefined;

        return {
          inputs: [
            {
              taskId,
              taskTag,
              isPingback: true,
              taskResults: undefined
            }
          ]
        };
      }

      // Postback: POST request with full task results
      let body = (await ctx.request.json()) as any;
      let tasks = body?.tasks ?? [];
      let inputs = tasks.map((task: any) => ({
        taskId: task?.id ?? '',
        taskTag: task?.data?.tag ?? undefined,
        isPingback: false,
        taskResults: task
      }));

      if (inputs.length === 0 && body?.id) {
        inputs.push({
          taskId: body.id,
          taskTag: body.data?.tag,
          isPingback: false,
          taskResults: body
        });
      }

      return {
        inputs:
          inputs.length > 0
            ? inputs
            : [
                {
                  taskId: 'unknown',
                  isPingback: false,
                  taskResults: body
                }
              ]
      };
    },

    handleEvent: async ctx => {
      let { taskId, taskTag, isPingback, taskResults } = ctx.input;

      let statusCode = taskResults?.status_code;
      let statusMessage = taskResults?.status_message;
      let resultCount = taskResults?.result_count;
      let results = taskResults?.result;
      let cost = taskResults?.cost;

      return {
        type: 'task.completed',
        id: taskId,
        output: {
          taskId,
          taskTag,
          isPingback,
          statusCode,
          statusMessage,
          resultCount,
          results,
          cost
        }
      };
    }
  })
  .build();
