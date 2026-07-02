import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listResponses = SlateTool.create(spec, {
  name: 'List Responses',
  key: 'list_responses',
  description: `List all responses for a given survey. Returns response data including answers, metadata (user agent, country), completion status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      surveyId: z.string().describe('ID of the survey to list responses for'),
      limit: z.number().optional().describe('Maximum number of responses to return'),
      offset: z.number().optional().describe('Number of responses to skip for pagination')
    })
  )
  .output(
    z.object({
      responses: z.array(
        z.object({
          responseId: z.string().describe('Unique response identifier'),
          surveyId: z.string().describe('Associated survey ID'),
          finished: z.boolean().describe('Whether the response is complete'),
          answers: z
            .record(z.string(), z.any())
            .describe('Response answers keyed by question ID'),
          meta: z.any().optional().describe('Response metadata (user agent, country, etc.)'),
          contactAttributes: z
            .any()
            .optional()
            .describe('Contact attributes of the respondent'),
          createdAt: z.string().describe('Response creation timestamp'),
          updatedAt: z.string().describe('Response last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let responses = await client.listResponses(ctx.input.surveyId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = responses.map((r: any) => ({
      responseId: r.id,
      surveyId: r.surveyId ?? ctx.input.surveyId,
      finished: r.finished ?? false,
      answers: r.data ?? {},
      meta: r.meta,
      contactAttributes: r.contactAttributes,
      createdAt: r.createdAt ?? '',
      updatedAt: r.updatedAt ?? ''
    }));

    return {
      output: { responses: mapped },
      message: `Found **${mapped.length}** response(s) for survey \`${ctx.input.surveyId}\`.`
    };
  })
  .build();
