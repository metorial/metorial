import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let getFormResponses = SlateTool.create(spec, {
  name: 'Get Form Responses',
  key: 'get_form_responses',
  description: `Retrieve form submission responses from BoloForms. Can fetch all responses, filter by a specific form, or retrieve a single response by ID. Returns submitted answers and metadata.`,
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
        .describe('Specific response ID to retrieve a single response'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z.number().optional().describe('Number of responses per page (default: 10)')
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

    let responses = result.responses ?? result.data ?? [];
    if (!Array.isArray(responses)) {
      responses = [responses];
    }

    return {
      output: {
        responses,
        pagination: result.pagination
      },
      message: `Retrieved **${responses.length}** form response(s)${ctx.input.formId ? ` for form \`${ctx.input.formId}\`` : ''}.`
    };
  })
  .build();
