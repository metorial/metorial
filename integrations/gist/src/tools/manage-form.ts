import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList, validatePagination } from '../lib/response';
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
      page: z.number().optional().describe('Page number for forms or submissions'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Form field values for subscribe; email is added from the email input or contact lookup.'
        ),
      consentToProcess: z
        .boolean()
        .optional()
        .describe('Whether the contact consented to processing; pass their actual choice.'),
      perPage: z
        .number()
        .optional()
        .describe('Results per page for forms or submissions (max: 60)')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
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
    validatePagination({ page: ctx.input.page, perPage: ctx.input.perPage });
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listForms({
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        let forms = responseList(data.forms).map((f: any) => ({
          formId: requiredId(f.id),
          name: f.name,
          status: f.status
        }));
        return {
          output: { rawResponse: client.responses, forms, pages: data.pages },
          message: `Found **${forms.length}** forms.`
        };
      }

      case 'get': {
        if (!ctx.input.formId) throw createApiServiceError('formId is required');
        await client.getForm(ctx.input.formId);
        return {
          output: {
            rawResponse: client.responses,
            form:
              (client.responses[client.responses.length - 1] as any)?.form ??
              client.responses[client.responses.length - 1]
          },
          message: `Retrieved form **${ctx.input.formId}**.`
        };
      }

      case 'list_submissions': {
        if (!ctx.input.formId) throw createApiServiceError('formId is required');
        let data = await client.listFormSubmissions(ctx.input.formId, {
          page: ctx.input.page,
          per_page: ctx.input.perPage
        });
        return {
          output: {
            rawResponse: client.responses,
            submissions: responseList(data.submissions),
            pages: data.pages
          },
          message: `Found **${responseList(data.submissions).length}** submissions for form **${ctx.input.formId}**.`
        };
      }

      case 'subscribe': {
        if (!ctx.input.formId) throw createApiServiceError('formId is required');
        let body: Record<string, any> = {};
        body.fields = { ...ctx.input.fields };
        if (ctx.input.email) body.fields.email = ctx.input.email;
        if (ctx.input.contactId && !body.fields.email) {
          let contactData = await client.getContact(ctx.input.contactId);
          let contact = contactData.contact ?? contactData;
          body.fields.email = contact.email;
        }
        if (!Object.values(body.fields).some(value => value !== undefined))
          throw createApiServiceError(
            'Provide email, contactId with an email, or form fields.'
          );
        body.form_id = ctx.input.formId;
        if (ctx.input.consentToProcess !== undefined)
          body.consent_to_process = ctx.input.consentToProcess;
        await client.subscribeToForm(ctx.input.formId, body);
        return {
          output: { rawResponse: client.responses, subscribed: true },
          message: `Contact subscribed to form **${ctx.input.formId}**.`
        };
      }
    }
  })
  .build();
