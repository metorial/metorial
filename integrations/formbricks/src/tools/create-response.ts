import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createResponse = SlateTool.create(spec, {
  name: 'Create Response',
  key: 'create_response',
  description: `Create a new response for a survey. Submit answer data keyed by question ID. This triggers the response processing pipeline in Formbricks.`,
  instructions: [
    'The "answers" field should be an object mapping question IDs to answer values.',
    'Set "finished" to true if the response is complete, false if it is partial.'
  ]
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to create a response for'),
      answers: z.record(z.string(), z.any()).describe('Response answers keyed by question ID'),
      finished: z.boolean().default(true).describe('Whether the response is complete'),
      meta: z
        .object({
          userAgent: z.string().optional(),
          country: z.string().optional(),
          source: z.string().optional()
        })
        .optional()
        .describe('Optional metadata for the response')
    })
  )
  .output(
    z.object({
      responseId: z.string().describe('ID of the created response'),
      surveyId: z.string().describe('Associated survey ID'),
      finished: z.boolean().describe('Whether the response is complete'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let response = await client.createResponse({
      surveyId: ctx.input.surveyId,
      data: ctx.input.answers,
      finished: ctx.input.finished,
      ...(ctx.input.meta ? { meta: ctx.input.meta } : {})
    });

    return {
      output: {
        responseId: response.id,
        surveyId: response.surveyId ?? ctx.input.surveyId,
        finished: response.finished ?? ctx.input.finished,
        createdAt: response.createdAt ?? ''
      },
      message: `Created response \`${response.id}\` for survey \`${ctx.input.surveyId}\` (finished: ${response.finished ?? ctx.input.finished}).`
    };
  })
  .build();
