import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let extractWebData = SlateTool.create(spec, {
  name: 'Extract Web Data',
  key: 'extract_web_data',
  description:
    'Extract structured data or page content with the CustomJS browser agent. Describe the source website and the information to collect in plain language.',
  instructions: [
    'Include the website URL in goal or provide url. Use maxSteps to limit browser actions.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      goal: z
        .string()
        .describe(
          'Plain-language data extraction task, including the source URL unless url is provided.'
        ),
      url: z.string().optional().describe('Optional starting URL for the browser.'),
      maxSteps: z
        .number()
        .optional()
        .describe('Maximum number of browser actions. The provider defaults to 10.'),
      output: z
        .enum(['ai_extract', 'text', 'html', 'markdown'])
        .optional()
        .describe('Preferred result format. Defaults to ai_extract.')
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe(
          'Complete provider response, including extracted data, browser events, and usage when provided.'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.goal.trim())
      throw createApiServiceError('Describe the website data to extract.');
    if (
      ctx.input.maxSteps !== undefined &&
      (!Number.isInteger(ctx.input.maxSteps) || ctx.input.maxSteps < 1)
    ) {
      throw createApiServiceError('maxSteps must be a positive whole number.');
    }
    let result = await new ExecutionClient(ctx.auth).extractWebData(ctx.input);
    return { output: { result }, message: 'Completed the browser data extraction task.' };
  })
  .build();
