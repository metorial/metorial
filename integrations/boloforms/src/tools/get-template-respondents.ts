import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplateRespondents = SlateTool.create(spec, {
  name: 'Get Template Respondents',
  key: 'get_template_respondents',
  description: `Retrieve signer details, statuses, and signing progress for a PDF template or a specific respondent document. Provide templateId, respondentDocumentId, or both.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().optional().describe('Template UUID to retrieve respondents for'),
      respondentDocumentId: z
        .string()
        .optional()
        .describe(
          'Respondent Mongo ObjectId; use createdDocumentId returned by send_template'
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
      respondents: z
        .array(z.record(z.string(), z.any()))
        .describe('List of respondents with signer details and statuses'),
      pagination: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional(),
          totalDocuments: z.number().optional(),
          hasNextPage: z.boolean().optional(),
          hasPreviousPage: z.boolean().optional()
        })
        .optional()
        .describe('Pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BoloFormsClient({ token: ctx.auth.token });

    let result = await client.getTemplateRespondents({
      templateId: ctx.input.templateId,
      respondentDocumentId: ctx.input.respondentDocumentId,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let respondents =
      result.respondents ?? result.data ?? (ctx.input.respondentDocumentId ? result : []);
    if (!Array.isArray(respondents)) {
      respondents = [respondents];
    }

    return {
      output: {
        respondents,
        pagination: result.pagination ?? undefined
      },
      message: `Retrieved **${respondents.length}** respondent document(s).`
    };
  })
  .build();
