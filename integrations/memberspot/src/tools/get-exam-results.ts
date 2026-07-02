import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExamResultsTool = SlateTool.create(spec, {
  name: 'Get Exam Results',
  key: 'get_exam_results',
  description: `Retrieve exam results for a specific exam. Returns all user submissions and scores, enabling tracking of assessment outcomes and automating follow-up actions based on exam performance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      examId: z.string().describe('ID of the exam to retrieve results for')
    })
  )
  .output(
    z.object({
      examResults: z
        .array(z.record(z.string(), z.any()))
        .describe('List of exam result entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getExamResults(ctx.input.examId);
    let examResults = Array.isArray(result) ? result : (result?.results ?? [result]);

    return {
      output: { examResults },
      message: `Retrieved **${examResults.length}** exam result(s) for exam **${ctx.input.examId}**.`
    };
  })
  .build();
