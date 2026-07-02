import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `Search and retrieve submitted form data from a CommCare project. Forms capture data collected during a single interaction.
Filter by form type (xmlns), date received, application, and more. Returns paginated results including form responses and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      xmlns: z
        .string()
        .optional()
        .describe('Filter by form XML namespace (form type identifier)'),
      appId: z.string().optional().describe('Filter by application ID'),
      receivedOnStart: z
        .string()
        .optional()
        .describe('Filter forms received on or after this date (ISO 8601)'),
      receivedOnEnd: z
        .string()
        .optional()
        .describe('Filter forms received on or before this date (ISO 8601)'),
      includeArchived: z.boolean().optional().describe('Include archived forms in results'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 20)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string(),
          appId: z.string(),
          receivedOn: z.string(),
          formType: z.string(),
          formData: z.record(z.string(), z.any()),
          submittedBy: z.string(),
          archived: z.boolean()
        })
      ),
      totalCount: z.number(),
      hasMore: z.boolean(),
      limit: z.number(),
      offset: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      domain: ctx.config.domain,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.listForms({
      xmlns: ctx.input.xmlns,
      appId: ctx.input.appId,
      receivedOnStart: ctx.input.receivedOnStart,
      receivedOnEnd: ctx.input.receivedOnEnd,
      includeArchived: ctx.input.includeArchived,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let forms = result.objects.map(f => ({
      formId: f.id,
      appId: f.app_id,
      receivedOn: f.received_on,
      formType: f.type,
      formData: f.form,
      submittedBy: f.metadata?.username || '',
      archived: f.archived
    }));

    return {
      output: {
        forms,
        totalCount: result.meta.total_count,
        hasMore: result.meta.next !== null,
        limit: result.meta.limit,
        offset: result.meta.offset
      },
      message: `Found **${result.meta.total_count}** forms. Returned ${forms.length} results.`
    };
  })
  .build();
