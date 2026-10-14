import { SlateTool } from 'slates';
import { z } from 'zod';
import { PersonaClient } from '../lib/client';
import { normalizeListResponse } from '../lib/helpers';
import { spec } from '../spec';

export let listInquiryTemplates = SlateTool.create(spec, {
  name: 'List Inquiry Templates',
  key: 'list_inquiry_templates',
  description:
    'Discover inquiry template IDs, names, status, and published versions for creating inquiries. Persona requires a production API key for this organization-level endpoint; it is unavailable with sandbox keys.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of templates per page'),
      pageCursor: z.string().optional().describe('Cursor from nextCursor on the previous page')
    })
  )
  .output(
    z.object({
      templates: z.array(
        z.object({
          inquiryTemplateId: z.string().describe('Template ID to use in create_inquiry'),
          name: z.string().optional(),
          status: z.string().optional(),
          latestPublishedVersionId: z.string().optional(),
          attributes: z.record(z.string(), z.any())
        })
      ),
      nextCursor: z.string().optional(),
      previousCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PersonaClient({ token: ctx.auth.token });
    let result = await client.listInquiryTemplates({
      pageSize: ctx.input.pageSize,
      pageAfter: ctx.input.pageCursor
    });
    let { items, nextCursor, previousCursor } = normalizeListResponse(result);
    let templates = items.map(item => ({
      inquiryTemplateId: item.resourceId,
      name: item.name ?? undefined,
      status: item.status ?? undefined,
      latestPublishedVersionId: item.relationships?.['latest-published-version']?.id,
      attributes: item
    }));
    return {
      output: { templates, nextCursor, previousCursor },
      message: `Found **${templates.length}** inquiry templates.`
    };
  })
  .build();
