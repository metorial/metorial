import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createResponse = SlateTool.create(spec, {
  name: 'Create Response',
  key: 'create_response',
  description: `Create a new response for a survey. Submit answer data keyed by question ID. This triggers configured webhooks, integrations, and follow-up emails for finished responses. These effects remain after deleting the response.`,
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
          userAgent: z
            .string()
            .optional()
            .describe(
              'Historical string field is unsupported by current API; omit it and use userAgentDetails.'
            ),
          userAgentDetails: z
            .object({
              browser: z.string().optional(),
              os: z.string().optional(),
              device: z.string().optional()
            })
            .optional(),
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
      baseUrl: ctx.config.baseUrl,
      instanceUrl: ctx.auth.instanceUrl
    });

    if (ctx.input.meta?.userAgent !== undefined)
      throw createApiServiceError(
        'Current response metadata requires a structured user agent. Omit userAgent and use userAgentDetails with browser, os, or device.',
        { reason: 'unsupported_input' }
      );
    const meta =
      ctx.input.meta === undefined
        ? undefined
        : pickDefined({
            country: ctx.input.meta.country,
            source: ctx.input.meta.source,
            userAgent: ctx.input.meta.userAgentDetails
          });
    let response = await client.createResponse({
      surveyId: ctx.input.surveyId,
      data: ctx.input.answers,
      finished: ctx.input.finished,
      ...(meta === undefined ? {} : { meta })
    });

    return {
      output: {
        responseId: response.id,
        surveyId: response.surveyId,
        finished: response.finished,
        createdAt: response.createdAt
      },
      message: `Created response \`${response.id}\` for survey \`${ctx.input.surveyId}\` (finished: ${response.finished}).`
    };
  })
  .build();
