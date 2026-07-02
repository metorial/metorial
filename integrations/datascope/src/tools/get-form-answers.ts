import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFormAnswers = SlateTool.create(spec, {
  name: 'Get Form Answers',
  key: 'get_form_answers',
  description: `Retrieve submitted form answers (responses) from DataScope. Results can be filtered by form, user, date range, and location. Returns submission data including GPS coordinates showing where each form was completed.

Use **detailed mode** to get full question metadata including question types, section labels, subform indices, and linked list references.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'By default returns submissions from the last 7 days. Use start/end to extend the range.',
    'Maximum 200 results per request. Use limit and offset for pagination.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().optional().describe('Filter by form ID'),
      userId: z.string().optional().describe('Filter by user ID'),
      start: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date for filtering (YYYY-MM-DD)'),
      locationId: z.string().optional().describe('Filter by location ID'),
      detailed: z
        .boolean()
        .optional()
        .describe('If true, returns detailed format with full question metadata'),
      sortByModified: z
        .boolean()
        .optional()
        .describe('If true, sorts results by modification date'),
      limit: z.number().optional().describe('Max results to return (max 200)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      answers: z.array(z.any()).describe('Array of form submission records'),
      count: z.number().describe('Number of submissions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results: any;

    if (ctx.input.detailed) {
      results = await client.getAnswersDetailed({
        formId: ctx.input.formId,
        userId: ctx.input.userId,
        start: ctx.input.start,
        end: ctx.input.end,
        locationId: ctx.input.locationId
      });
    } else {
      results = await client.getAnswers({
        formId: ctx.input.formId,
        userId: ctx.input.userId,
        start: ctx.input.start,
        end: ctx.input.end,
        locationId: ctx.input.locationId,
        dateModified: ctx.input.sortByModified,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    }

    let answersArray = Array.isArray(results) ? results : [];

    return {
      output: {
        answers: answersArray,
        count: answersArray.length
      },
      message: `Retrieved **${answersArray.length}** form submission(s)${ctx.input.formId ? ` for form ${ctx.input.formId}` : ''}.`
    };
  })
  .build();
