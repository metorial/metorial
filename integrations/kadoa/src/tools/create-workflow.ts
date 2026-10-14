import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { KadoaClient } from '../lib/client';
import { validateKadoaInteger } from '../lib/validation';
import { spec } from '../spec';

export let createWorkflow = SlateTool.create(spec, {
  name: 'Create Workflow',
  key: 'create_workflow',
  description:
    'Create a persistent extraction workflow from one or more URLs and natural-language instructions. Returns the workflow ID for inspecting, running, and retrieving its data.',
  instructions: [
    'Describe the data to extract and any pagination or navigation steps in userPrompt.',
    'Use get_workflow_details to inspect the new workflow and its preview before running it.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      urls: z.array(z.url()).min(1).describe('One or more target URLs to extract from'),
      userPrompt: z
        .string()
        .min(10)
        .max(5000)
        .describe('Instructions describing what to extract and how to navigate the website'),
      name: z.string().min(1).optional().describe('Workflow name'),
      description: z.string().max(500).optional().describe('Workflow description'),
      tags: z.array(z.string().min(2)).optional().describe('Tags for organizing the workflow'),
      interval: z
        .enum(['ONLY_ONCE', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM'])
        .optional()
        .describe('Recurring frequency; CUSTOM uses schedules'),
      schedules: z
        .array(z.string())
        .optional()
        .describe('Cron expressions for a custom recurring schedule'),
      timezone: z
        .string()
        .optional()
        .describe('IANA timezone for cron schedules; defaults to UTC'),
      limit: z
        .number()
        .optional()
        .describe('Maximum records to extract per run, from 1 to 2147483647')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('Created workflow ID'),
      success: z.boolean().describe('Whether the workflow was created'),
      message: z.string().optional().describe('Provider status message')
    })
  )
  .handleInvocation(async ctx => {
    validateKadoaInteger(ctx.input.limit, 'limit', 1, 2147483647);
    if (ctx.input.interval === 'CUSTOM' && !ctx.input.schedules?.length) {
      throw createApiServiceError('Provide schedules when interval is CUSTOM.');
    }
    let client = new KadoaClient({ token: ctx.auth.token });
    let result = await client.createWorkflow({
      ...pickDefined(ctx.input),
      urls: ctx.input.urls,
      userPrompt: ctx.input.userPrompt
    });
    if (typeof result.workflowId !== 'string' || !result.workflowId) {
      throw createApiServiceError(
        'Kadoa did not return the created workflow ID. Check your dashboard before retrying.'
      );
    }
    return {
      output: {
        workflowId: result.workflowId,
        success: result.success === true,
        message: result.message ?? undefined
      },
      message: `Created workflow **${result.workflowId}**. Inspect its configuration and preview with get_workflow_details.`
    };
  })
  .build();
