import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let taskSchema = z.object({
  taskId: z.string().describe('Task identifier'),
  taskType: z.string().optional().describe('Type of the task'),
  status: z.string().optional().describe('Current task status'),
  progress: z.string().optional().describe('Percentage completion if still processing'),
  gridImageUrl: z.string().optional().describe('URL of a generated image grid'),
  imageUrls: z.array(z.string()).optional().describe('URLs of generated images'),
  imageUrl: z.string().optional().describe('URL of a single result image'),
  videoUrls: z.array(z.string()).optional().describe('URLs of generated videos'),
  prompts: z.array(z.string()).optional().describe('Prompt suggestions'),
  seed: z.string().optional().describe('Seed value'),
  styleReference: z.string().optional().describe('Style reference code if applicable'),
  error: z.string().optional().describe('Provider error message when the task failed')
});

export let fetchManyTasks = SlateTool.create(spec, {
  name: 'Fetch Many Tasks',
  key: 'fetch_many_tasks',
  description:
    'Check the statuses and results of multiple APIFRAME Midjourney tasks in one request.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      taskIds: z
        .array(z.string())
        .min(2)
        .max(20)
        .describe('Task IDs to fetch. APIFRAME accepts 2 to 20 task IDs.')
    })
  )
  .output(
    z.object({
      tasks: z.array(taskSchema).describe('Task statuses and results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.fetchMany(ctx.input.taskIds);
    let tasks = result.tasks.map(task => ({
      taskId: task.task_id,
      taskType: task.task_type,
      status: task.status ?? 'completed',
      progress: task.percentage,
      gridImageUrl: task.original_image_url,
      imageUrls: task.image_urls,
      imageUrl: task.image_url,
      videoUrls: task.video_urls,
      prompts: task.content,
      seed: task.seed,
      styleReference: task.sref,
      error: task.error
    }));

    return {
      output: {
        tasks
      },
      message: `Fetched ${tasks.length} Midjourney tasks.`
    };
  })
  .build();
