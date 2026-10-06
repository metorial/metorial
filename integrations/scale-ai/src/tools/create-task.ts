import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new annotation task in Scale AI. Supports all task types including image annotation, video annotation, text collection, document transcription, LiDAR annotation, and more. The task type determines which parameters are required.`,
  instructions: [
    'The taskType determines the API endpoint used (e.g., "imageannotation", "textcollection", "documenttranscription", "videoannotation", "lidarannotation").',
    'For image annotation, provide "attachment" (image URL) and "geometries" in taskParams.',
    'For text collection, provide "fields" array in taskParams.',
    'For document transcription, provide "attachment" (document URL) in taskParams.',
    'Either "project" or "batch" must be specified. If batch is provided, the task is automatically associated with the batch\'s project.'
  ],
  constraints: [
    'Tasks created with live mode API keys will be completed by humans and incur charges.',
    'Tasks created with test mode API keys return simulated responses.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      taskType: z
        .string()
        .regex(/^[a-z][a-z0-9_]*$/)
        .describe(
          'Type of annotation task (e.g., imageannotation, textcollection, documenttranscription, videoannotation, lidarannotation, namedentityrecognition, segmentannotation)'
        ),
      project: z.string().optional().describe('Project name to associate the task with'),
      batch: z
        .string()
        .optional()
        .describe(
          "Batch name to associate the task with (auto-associates with batch's project)"
        ),
      instruction: z
        .string()
        .optional()
        .describe('Markdown-enabled instructions for annotators'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL or email address for completion notification'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom key-value metadata (max 10KB)'),
      priority: z
        .number()
        .int()
        .min(10)
        .max(30)
        .optional()
        .describe('Task priority from 10 (lowest) through 30 (highest)'),
      uniqueId: z
        .string()
        .optional()
        .describe('Custom deduplication identifier (must be unique across all projects)'),
      tags: z
        .array(z.string().min(1))
        .max(5)
        .optional()
        .describe('Up to 5 arbitrary labels for the task'),
      taskParams: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Type-specific parameters (e.g., attachment, geometries, fields, labels). These are sent directly in the task creation body.'
        )
    })
  )
  .output(
    z
      .object({
        taskId: z.string().describe('Unique identifier of the created task'),
        taskType: z.string().optional().describe('Type of the task'),
        status: z.string().optional().describe('Current status of the task'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, unknown> = { ...ctx.input.taskParams };
    if (ctx.input.project !== undefined) body.project = ctx.input.project;
    if (ctx.input.batch !== undefined) body.batch = ctx.input.batch;
    if (ctx.input.instruction !== undefined) body.instruction = ctx.input.instruction;
    if (ctx.input.callbackUrl !== undefined) body.callback_url = ctx.input.callbackUrl;
    if (ctx.input.metadata !== undefined) body.metadata = ctx.input.metadata;
    if (ctx.input.priority !== undefined) body.priority = ctx.input.priority;
    if (ctx.input.uniqueId !== undefined) body.unique_id = ctx.input.uniqueId;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (!body.project && !body.batch) {
      throw createApiServiceError(
        'Provide a project or batch name. Call list_projects or list_batches to discover one.'
      );
    }

    let result = await client.createTask(ctx.input.taskType, body);

    return {
      output: {
        taskId: result.task_id,
        taskType: result.type,
        status: result.status,
        createdAt: result.created_at,
        ...result
      },
      message: `Created \`${ctx.input.taskType}\` task **${result.task_id}** with status \`${result.status}\`.`
    };
  })
  .build();
