import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let scheduledTaskCompleted = SlateTrigger.create(spec, {
  name: 'Scheduled Task Completed',
  key: 'scheduled_task_completed',
  description:
    'Triggers when a scheduled SERP or Trends search task completes. Receives the full result payload via SERPHouse postback webhook. Configure the webhook URL in your SERPHouse dashboard or pass it as the postbackUrl when scheduling tasks.'
})
  .input(
    z.object({
      taskId: z.string().describe('Unique ID of the completed task'),
      taskType: z.string().describe('Type of task: "serp" or "trends"'),
      searchResults: z.any().describe('Full search result payload')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Unique ID of the completed task'),
      taskType: z.string().describe('Type of task: "serp" or "trends"'),
      status: z.string().optional().describe('Task completion status'),
      searchMetadata: z.any().optional().describe('Search metadata'),
      searchParameters: z.any().optional().describe('Search parameters used'),
      results: z.any().optional().describe('Structured search results')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) {
        return { inputs: [] };
      }

      let resultsData = body?.results;
      let taskId = resultsData?.search_metadata?.id?.toString() ?? '';
      let taskType = body?.trends_data ? 'trends' : 'serp';

      return {
        inputs: [
          {
            taskId,
            taskType,
            searchResults: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let body = ctx.input.searchResults;
      let resultsData = body?.results;

      return {
        type: `task.completed`,
        id: ctx.input.taskId || `task-${Date.now()}`,
        output: {
          taskId: ctx.input.taskId,
          taskType: ctx.input.taskType,
          status: body?.status ?? resultsData?.search_metadata?.status,
          searchMetadata: resultsData?.search_metadata,
          searchParameters: resultsData?.search_parameters,
          results: resultsData?.results
        }
      };
    }
  })
  .build();
