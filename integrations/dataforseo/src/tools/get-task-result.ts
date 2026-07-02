import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTaskResult = SlateTool.create(spec, {
  name: 'Get Task Result',
  key: 'get_task_result',
  description: `Retrieve the results of a previously submitted asynchronous task by its task ID. Use this after creating tasks via On-Page Audit, Google Shopping Search, or other tools that return a task ID. Returns the full task results once the task is completed.`,
  instructions: [
    'Provide the task ID from a previously created task and choose the endpoint enum that created it.',
    'Use On-Page Results for OnPage audit tasks; OnPage does not use the generic task_get/advanced pattern.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task ID from a previously created task'),
      endpoint: z
        .enum([
          'google_shopping_products',
          'amazon_products',
          'amazon_asin',
          'google_play_app_searches',
          'google_play_app_info',
          'google_play_app_reviews',
          'google_reviews'
        ])
        .describe(
          'Documented async task endpoint. Use google_shopping_products for Google Shopping, amazon_products or amazon_asin for Amazon Merchant tasks, google_play_* for App Data tasks, and google_reviews for Business Data Google Reviews.'
        )
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('The task ID'),
      statusCode: z.number().describe('Task status code'),
      statusMessage: z.string().describe('Task status message'),
      results: z.array(z.any()).describe('Task results when available'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.getTaskResult(ctx.input.endpoint, ctx.input.taskId);
    let task = response.tasks?.[0];

    return {
      output: {
        taskId: ctx.input.taskId,
        statusCode: task?.status_code ?? 0,
        statusMessage: task?.status_message ?? 'Unknown',
        results: task?.result ?? [],
        cost: response.cost
      },
      message:
        task?.status_code === 20000
          ? `Task \`${ctx.input.taskId}\` completed successfully with **${task?.result_count ?? 0}** result(s).`
          : `Task \`${ctx.input.taskId}\` status: **${task?.status_message ?? 'Unknown'}** (code: ${task?.status_code ?? 'N/A'}).`
    };
  })
  .build();
