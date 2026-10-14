import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let listEmailTemplates = SlateTool.create(spec, {
  name: 'List Email Templates',
  key: 'list_email_templates',
  description:
    'List existing MSG91 email templates and their identifiers for send_email. Supports name search, verification status, pagination, and optional template versions.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      keyword: z.string().optional().describe('Search by template name'),
      status: z
        .enum(['pending', 'verified', 'rejected'])
        .optional()
        .describe('Template verification status'),
      page: z.number().int().min(1).optional().describe('Page number'),
      pageSize: z.number().int().min(1).optional().describe('Templates per page'),
      includeVersions: z.boolean().optional().describe('Include template version details')
    })
  )
  .output(
    z.object({
      response: z.any().describe('Templates, identifiers, and provider pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });
    let statusIds = { pending: 1, verified: 2, rejected: 5 };
    let response = await client.getEmailTemplates({
      keyword: ctx.input.keyword,
      statusId: ctx.input.status ? statusIds[ctx.input.status] : undefined,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      includeVersions: ctx.input.includeVersions
    });
    return { output: { response }, message: 'Retrieved email templates.' };
  })
  .build();
