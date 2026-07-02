import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let storeResponse = SlateTool.create(spec, {
  name: 'Store Survey Response',
  key: 'store_response',
  description: `Store a survey response for a user. Useful for importing historical survey data or storing responses collected through your own custom survey UI.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('External user ID'),
      email: z.string().optional().describe('Email address of the user'),
      surveyUuid: z.string().describe('UUID of the survey to store the response for'),
      responseDate: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp for the response (defaults to now)'),
      preventDuplicates: z
        .boolean()
        .optional()
        .describe('Prevent duplicate responses (default: true)'),
      responseData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Response data keyed by question identifier (e.g. { "nps": 9, "feedback": "Great product!" })'
        )
    })
  )
  .output(
    z.object({
      responseUuid: z.string().describe('UUID of the stored response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let result = (await client.storeResponse({
      id: ctx.input.userId,
      email: ctx.input.email,
      formUuid: ctx.input.surveyUuid,
      date: ctx.input.responseDate,
      preventDuplicates: ctx.input.preventDuplicates,
      responseData: ctx.input.responseData
    })) as any;

    let identifier = ctx.input.userId || ctx.input.email || 'unknown';

    return {
      output: {
        responseUuid: result.uuid
      },
      message: `Stored survey response for user **${identifier}** (response UUID: ${result.uuid}).`
    };
  })
  .build();
