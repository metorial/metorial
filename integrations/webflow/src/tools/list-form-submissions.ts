import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebflowClient } from '../lib/client';
import { spec } from '../spec';

export let listFormSubmissions = SlateTool.create(spec, {
  name: 'List Form Submissions',
  key: 'list_form_submissions',
  description: `List forms for a site and retrieve their submissions. Provide a siteId to list all forms, or a formId to get submissions for a specific form.`,
  instructions: [
    'To list all forms on a site, provide siteId only.',
    'To get submissions for a specific form, provide formId.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().optional().describe('Site ID to list all forms'),
      formId: z.string().optional().describe('Form ID to get submissions for a specific form'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Unique identifier for the form'),
            displayName: z.string().optional().describe('Display name of the form'),
            siteId: z.string().optional().describe('Site the form belongs to'),
            pageId: z.string().optional().describe('Page the form is on'),
            pageName: z.string().optional().describe('Name of the page the form is on'),
            fields: z.array(z.any()).optional().describe('Form field definitions')
          })
        )
        .optional()
        .describe('List of forms (when querying by siteId)'),
      submissions: z
        .array(
          z.object({
            submissionId: z.string().describe('Unique identifier for the submission'),
            formId: z.string().optional().describe('Form the submission belongs to'),
            submittedAt: z.string().optional().describe('ISO 8601 submission timestamp'),
            formData: z
              .record(z.string(), z.any())
              .optional()
              .describe('Submitted form field values')
          })
        )
        .optional()
        .describe('List of form submissions (when querying by formId)'),
      pagination: z
        .object({
          offset: z.number().optional(),
          limit: z.number().optional(),
          total: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebflowClient(ctx.auth.token);

    if (ctx.input.formId) {
      let data = await client.listFormSubmissions(ctx.input.formId, {
        offset: ctx.input.offset,
        limit: ctx.input.limit
      });
      let submissions = (data.formSubmissions ?? data.submissions ?? []).map((s: any) => ({
        submissionId: s.id ?? s._id,
        formId: s.formId,
        submittedAt: s.submittedAt ?? s.dateSubmitted,
        formData: s.formData ?? s.data
      }));

      return {
        output: { submissions, pagination: data.pagination },
        message: `Found **${submissions.length}** submission(s) for form **${ctx.input.formId}**.`
      };
    }

    if (!ctx.input.siteId) {
      throw new Error('Either siteId or formId must be provided');
    }

    let data = await client.listForms(ctx.input.siteId, {
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });
    let forms = (data.forms ?? []).map((f: any) => ({
      formId: f.id ?? f._id,
      displayName: f.displayName ?? f.name,
      siteId: f.siteId,
      pageId: f.pageId,
      pageName: f.pageName,
      fields: f.fields
    }));

    return {
      output: { forms, pagination: data.pagination },
      message: `Found **${forms.length}** form(s) on site **${ctx.input.siteId}**.`
    };
  })
  .build();
