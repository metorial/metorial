import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, publicResponse } from '../lib/client';
import { spec } from '../spec';
export const getResponse = SlateTool.create(spec, {
  name: 'Get Response',
  key: 'get_response',
  description:
    'Read one response by its exact ID, including its survey, answers, completion state, and timestamps.',
  tags: { readOnly: true }
})
  .input(z.object({ responseId: z.string().describe('Exact response ID') }))
  .output(
    z.object({
      responseId: z.string(),
      surveyId: z.string(),
      finished: z.boolean(),
      answers: z.record(z.string(), z.unknown()),
      meta: z.record(z.string(), z.unknown()).optional(),
      contactAttributes: z.record(z.string(), z.unknown()).nullish(),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => ({
    output: publicResponse(
      await new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl,
        instanceUrl: ctx.auth.instanceUrl
      }).getResponse(ctx.input.responseId)
    ),
    message: 'Retrieved the exact response.'
  }))
  .build();
