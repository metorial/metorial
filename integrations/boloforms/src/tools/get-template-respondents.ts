import { SlateTool } from 'slates';
import { z } from 'zod';
import { BoloFormsClient } from '../lib/client';
import { spec } from '../spec';

export let getTemplateRespondents = SlateTool.create(spec, {
  name: 'Get Template Respondents',
  key: 'get_template_respondents',
  description: `Retrieve respondent information for a specific template-based document. Returns signer details, statuses, and signing progress. Can fetch all respondents for a template or a specific respondent by document ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to retrieve respondents for'),
      respondentDocumentId: z
        .string()
        .optional()
        .describe('Specific respondent document ID to retrieve a single respondent'),
      page: z.number().optional().describe('Page number for pagination (default: 1)'),
      limit: z.number().optional().describe('Number of results per page (default: 10)')
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
          totalPages: z.number().optional()
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

    let respondents = result.respondents ?? result.data ?? [];
    if (!Array.isArray(respondents)) {
      respondents = [respondents];
    }

    return {
      output: {
        respondents,
        pagination: result.pagination
      },
      message: `Retrieved **${respondents.length}** respondent(s) for template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
