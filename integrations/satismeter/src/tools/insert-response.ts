import { SlateTool } from 'slates';
import { z } from 'zod';
import { SatisMeterClient } from '../lib/client';
import { spec } from '../spec';

export let insertResponseTool = SlateTool.create(spec, {
  name: 'Insert Survey Response',
  key: 'insert_response',
  description: `Submit a survey response programmatically. Associate the response with a specific survey and provide answers to its questions. Supports identified users (via userId) or anonymous respondents (via anonymousId). Optionally specify the delivery method and user traits.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      surveyId: z
        .string()
        .describe('ID of the survey (campaign) to associate the response with'),
      userId: z
        .string()
        .optional()
        .describe(
          'ID of the user submitting the response. Provide either userId or anonymousId.'
        ),
      anonymousId: z
        .string()
        .optional()
        .describe(
          'Anonymous identifier if the user cannot be identified. Provide either userId or anonymousId.'
        ),
      answers: z
        .array(
          z.object({
            questionId: z.string().describe('ID of the survey question'),
            value: z
              .union([z.string(), z.number()])
              .describe(
                'Answer value: integer for rating questions, string for text/single-choice questions'
              )
          })
        )
        .describe('Array of answers to the survey questions'),
      method: z
        .enum(['In-App', 'Mobile', 'Email'])
        .optional()
        .describe('Survey delivery method (defaults to In-App)'),
      traits: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional user traits to associate with the response')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the response was inserted successfully'),
      surveyId: z.string().describe('The survey ID the response was associated with')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SatisMeterClient(ctx.auth.token, ctx.auth.writeKey);
    await client.insertResponse({
      writeKey: ctx.auth.writeKey,
      campaignId: ctx.input.surveyId,
      userId: ctx.input.userId,
      anonymousId: ctx.input.anonymousId,
      answers: ctx.input.answers.map(a => ({ questionId: a.questionId, value: a.value })),
      method: ctx.input.method,
      traits: ctx.input.traits
    });

    return {
      output: { success: true, surveyId: ctx.input.surveyId },
      message: `Successfully inserted response for survey **${ctx.input.surveyId}**.`
    };
  })
  .build();
