import { SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { spec } from '../spec';

export let manageForm = SlateTool.create(spec, {
  name: 'Manage Form',
  key: 'manage_form',
  description: `List forms, view form details and submissions, or subscribe a contact to a form. Forms capture lead data and can trigger automations.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'list_submissions', 'subscribe'])
        .describe('Action to perform'),
      formId: z
        .string()
        .optional()
        .describe('Form ID (required for get, list_submissions, subscribe)'),
      email: z.string().optional().describe('Contact email (for subscribe)'),
      contactId: z.string().optional().describe('Contact ID (for subscribe)'),
      page: z.number().optional().describe('Page number for submissions'),
      perPage: z.number().optional().describe('Results per page for submissions')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string(),
            name: z.string().optional(),
            status: z.string().optional()
          })
        )
        .optional(),
      form: z.any().optional(),
      submissions: z.array(z.any()).optional(),
      subscribed: z.boolean().optional(),
      pages: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listForms();
        let forms = (data.forms || []).map((f: any) => ({
          formId: String(f.id),
          name: f.name,
          status: f.status
        }));
        return {
          output: { forms },
          message: `Found **${forms.length}** forms.`
        };
      }

      case 'get': {
        if (!ctx.input.formId) throw new Error('formId is required');
        let data = await client.getForm(ctx.input.formId);
        return {
          output: { form: data.form || data },
          message: `Retrieved form **${ctx.input.formId}**.`
        };
      }

      case 'list_submissions': {
        if (!ctx.input.formId) throw new Error('formId is required');
        let data = await client.listFormSubmissions(ctx.input.formId, {
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        return {
          output: {
            submissions: data.submissions || [],
            pages: data.pages
          },
          message: `Found **${(data.submissions || []).length}** submissions for form **${ctx.input.formId}**.`
        };
      }

      case 'subscribe': {
        if (!ctx.input.formId) throw new Error('formId is required');
        let body: Record<string, any> = {};
        if (ctx.input.email) body.email = ctx.input.email;
        if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
        await client.subscribeToForm(ctx.input.formId, body);
        return {
          output: { subscribed: true },
          message: `Contact subscribed to form **${ctx.input.formId}**.`
        };
      }
    }
  })
  .build();
