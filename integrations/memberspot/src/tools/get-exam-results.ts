import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMemberspotList, getMemberspotNextPage } from '../lib/responses';
import { spec } from '../spec';

export let getExamResultsTool = SlateTool.create(spec, {
  name: 'Get Exam Results',
  key: 'get_exam_results',
  description: `Retrieve exam results for a specific exam. Returns one page of user submissions and scores. Call list_exams to discover exam IDs. Use the results to track assessment outcomes and follow up on exam performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      examId: z.string().describe('Exam ID. Call list_exams to discover exam IDs.'),
      lastLoadedId: z
        .string()
        .optional()
        .describe('Cursor from nextPage of the previous results page'),
      pageLength: z
        .number()
        .optional()
        .describe('Results per page, from 1 to 100; defaults to 10')
    })
  )
  .output(
    z.object({
      examResults: z
        .array(z.record(z.string(), z.any()))
        .describe('List of exam result entries'),
      nextPage: z
        .string()
        .optional()
        .describe('Pass this cursor as lastLoadedId for the next page'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getExamResults(ctx.input.examId, {
      lastLoadedId: ctx.input.lastLoadedId,
      pageLength: ctx.input.pageLength
    });
    let examResults = getMemberspotList(result, ['data', 'results']);

    return {
      output: { examResults, nextPage: getMemberspotNextPage(result), raw: result },
      message: `Retrieved **${examResults.length}** exam result(s) for exam **${ctx.input.examId}**.`
    };
  })
  .build();
