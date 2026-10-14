import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let getFormResponses = SlateTool.create(spec, {
  name: 'Get Form Responses',
  key: 'get_form_responses',
  description: `Retrieve submitted answers and metadata for a form or a specific response. Provide formId, responseId, or both. Page and limit apply when listing by formId only.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().optional().describe('ID of the form to retrieve responses for'),
      responseId: z
        .string()
        .optional()
        .describe(
          'Response Mongo ObjectId or formResponseId UUID to retrieve a single response'
        ),
      page: z
        .number()
        .optional()
        .describe('Whole-number page between 1 and 10000 (default: 1)'),
      limit: z
        .number()
        .optional()
        .describe('Whole-number page size between 1 and 100 (default: 10)')
    })
  )
  .output(
    z.object({
      responses: z
        .array(z.record(z.string(), z.any()))
        .describe('List of form responses with answers and metadata'),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional(),
          totalResponses: z.number().optional(),
          hasNextPage: z.boolean().optional(),
          hasPreviousPage: z.boolean().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });

    let result = await client.getFormResponses({
      formId: ctx.input.formId,
      responseId: ctx.input.responseId,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let responses = result.responses ?? result.data ?? (ctx.input.responseId ? result : []);
    if (!Array.isArray(responses)) {
      responses = [responses];
    }

    return {
      output: {
        responses,
        pagination: result.pagination ?? undefined
      },
      message: `Retrieved **${responses.length}** form response(s)${ctx.input.formId ? ` for form \`${ctx.input.formId}\`` : ''}.`
    };
  })
  .build();
