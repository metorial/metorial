import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBatch = SlateTool.create(spec, {
  name: 'Create Batch',
  key: 'create_batch',
  description: `Create a new batch within a Scale AI project. Batches organize tasks into groups — for example, by dataset or weekly submission. New batches start in "staging" status and must be finalized before tasks are sent to annotators.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project this batch belongs to'),
      batchName: z.string().describe('Unique name for the batch'),
      callbackUrl: z
        .string()
        .optional()
        .describe('URL or email for batch completion notification'),
      calibrationBatch: z
        .boolean()
        .optional()
        .describe('Whether this is a calibration batch (Rapid projects only)'),
      selfLabelBatch: z
        .boolean()
        .optional()
        .describe('Whether this is a self-label batch (Rapid projects only)')
    })
  )
  .output(
    z
      .object({
        batchName: z.string().describe('Name of the created batch'),
        projectName: z.string().optional().describe('Associated project name'),
        status: z
          .string()
          .optional()
          .describe('Batch status (staging, in_progress, completed)'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createBatch({
      project: ctx.input.projectName,
      name: ctx.input.batchName,
      callback: ctx.input.callbackUrl,
      calibrationBatch: ctx.input.calibrationBatch,
      selfLabelBatch: ctx.input.selfLabelBatch
    });

    return {
      output: {
        batchName: result.name ?? ctx.input.batchName,
        projectName: result.project ?? ctx.input.projectName,
        status: result.status,
        createdAt: result.created_at,
        ...result
      },
      message: `Created batch **${ctx.input.batchName}** in project **${ctx.input.projectName}**.`
    };
  })
  .build();
