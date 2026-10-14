import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getFormResponses = SlateTool.create(spec, {
  name: 'Get Form Responses',
  key: 'get_form_responses',
  description:
    'Retrieve a page of form responses with answers and workflow state. Returns your own responses by default; requesting all responses or another submitter requires VIEW_REPORTS permission.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      formUuid: z.string().describe('Form UUID. Use list_forms to discover available forms.'),
      all: z
        .boolean()
        .optional()
        .describe(
          'Return all responses rather than your own. Requires VIEW_REPORTS permission.'
        ),
      userUuid: z
        .string()
        .optional()
        .describe('Filter by submitter UUID. Requires VIEW_REPORTS permission.'),
      search: z
        .string()
        .optional()
        .describe('Search response content or visible submitter details'),
      state: z
        .string()
        .optional()
        .describe('Workflow state key; the form must have a workflow'),
      order: z
        .enum(['recent', 'oldest'])
        .optional()
        .describe('Response order; default recent'),
      dateStart: z
        .string()
        .optional()
        .describe('Inclusive start date (YYYY-MM-DD) in the caller timezone'),
      dateEnd: z
        .string()
        .optional()
        .describe('Inclusive end date (YYYY-MM-DD) in the caller timezone'),
      limit: z.number().optional().describe('Responses per page; default 25, maximum 50'),
      offset: z.number().optional().describe('Number of responses to skip; default 0')
    })
  )
  .output(
    z.object({
      formUuid: z.string().describe('UUID of the form'),
      responses: z
        .array(z.any())
        .describe('Form responses with their original answers and metadata'),
      count: z.number().optional().describe('Total number of matching responses'),
      next: z.string().nullable().optional().describe('URL of the next page, or null'),
      previous: z.string().nullable().optional().describe('URL of the previous page, or null'),
      raw: z.any().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new DailyBotClient({ token: ctx.auth.token }).getFormResponses(
      ctx.input.formUuid,
      ctx.input
    );
    let responses = result?.results ?? result;
    return {
      output: {
        formUuid: ctx.input.formUuid,
        responses,
        count: result?.count,
        next: result?.next,
        previous: result?.previous,
        raw: result
      },
      message: `Retrieved **${responses.length}** form response(s).`
    };
  })
  .build();
