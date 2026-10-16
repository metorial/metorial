import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { authorDetailSchema } from './get-author';

let authorMetricSchema = z.union([z.string(), z.number()]).nullable().optional();
let paperAuthorSchema = authorDetailSchema.extend({
  paperCount: authorMetricSchema.describe(
    'Total publication count in the provider’s original string or number form.'
  ),
  citationCount: authorMetricSchema.describe(
    'Total citation count in the provider’s original string or number form.'
  ),
  hIndex: authorMetricSchema.describe(
    'h-index in the provider’s original string or number form.'
  )
});

export let getPaperAuthors = SlateTool.create(spec, {
  key: 'get_paper_authors',
  name: 'Get Paper Authors',
  description:
    'Retrieve a paginated list of a paper’s authors with requested profile fields and optional publication metadata.',
  constraints: ['Maximum 1,000 authors per page.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      paperId: z
        .string()
        .describe(
          'Paper identifier, such as an S2 ID, DOI:identifier, or CorpusId:identifier.'
        ),
      fields: z
        .string()
        .optional()
        .describe(
          'Comma-separated author fields, such as name,affiliations,paperCount,papers.title.'
        ),
      offset: z
        .number()
        .optional()
        .describe('Non-negative integer pagination offset. Defaults to 0.'),
      limit: z
        .number()
        .optional()
        .describe('Integer page size from 1 to 1,000. Defaults to 100.')
    })
  )
  .output(
    z.object({
      offset: z.number().optional(),
      next: z.number().optional().describe('Next offset, absent on the last page.'),
      authors: z.array(paperAuthorSchema).describe('Author profiles on this page.')
    })
  )
  .handleInvocation(async ctx => {
    let { paperId, ...params } = ctx.input;
    let result = await new Client(ctx.auth).getPaperAuthors(paperId, params);
    return {
      output: { offset: result.offset, next: result.next, authors: result.data },
      message: `Retrieved **${result.data.length}** authors on this page.`
    };
  })
  .build();
