import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMemberspotList } from '../lib/responses';
import { spec } from '../spec';

export let listExamsTool = SlateTool.create(spec, {
  name: 'List Exams',
  key: 'list_exams',
  description:
    'Retrieve all exams and their IDs, names, and question counts. Use an exam ID with get_exam_results.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      exams: z
        .array(z.record(z.string(), z.any()))
        .describe('Provider exam records with identifiers and metadata'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client({ token: ctx.auth.token }).listExams();
    let exams = getMemberspotList(raw, ['data']);
    return { output: { exams, raw }, message: `Retrieved **${exams.length}** exams.` };
  })
  .build();
