import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List tax forms and documents for a company or a specific employee. Includes W-2, W-4, 1099, I-9, and other regulatory forms. Can also retrieve a specific form by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['company', 'employee', 'single'])
        .describe('Whether to list company forms, employee forms, or get a single form'),
      companyId: z.string().optional().describe('Company UUID (required for scope=company)'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee UUID (required for scope=employee)'),
      formId: z.string().optional().describe('Form UUID (required for scope=single)')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('UUID of the form'),
            name: z.string().optional().describe('Form name or type'),
            title: z.string().optional().describe('Form title'),
            description: z.string().optional().describe('Form description'),
            formType: z.string().optional().describe('Type of form (w2, w4, 1099, i9, etc.)'),
            year: z.number().optional().describe('Tax year'),
            signed: z.boolean().optional().describe('Whether the form has been signed'),
            requiresSigning: z
              .boolean()
              .optional()
              .describe('Whether the form requires signing')
          })
        )
        .optional()
        .describe('List of forms'),
      form: z.any().optional().describe('Single form details (for scope=single)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.scope) {
      case 'company': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.listCompanyForms(ctx.input.companyId);
        let forms = Array.isArray(result) ? result : result.forms || result;
        let mapped = forms.map((f: any) => ({
          formId: f.uuid || f.id?.toString(),
          name: f.name,
          title: f.title,
          description: f.description,
          formType: f.form_type,
          year: f.year,
          signed: f.signed,
          requiresSigning: f.requires_signing
        }));
        return {
          output: { forms: mapped },
          message: `Found **${mapped.length}** form(s) for company ${ctx.input.companyId}.`
        };
      }
      case 'employee': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.listEmployeeForms(ctx.input.employeeId);
        let forms = Array.isArray(result) ? result : result.forms || result;
        let mapped = forms.map((f: any) => ({
          formId: f.uuid || f.id?.toString(),
          name: f.name,
          title: f.title,
          description: f.description,
          formType: f.form_type,
          year: f.year,
          signed: f.signed,
          requiresSigning: f.requires_signing
        }));
        return {
          output: { forms: mapped },
          message: `Found **${mapped.length}** form(s) for employee ${ctx.input.employeeId}.`
        };
      }
      case 'single': {
        if (!ctx.input.formId) throw new Error('formId is required');
        let form = await client.getForm(ctx.input.formId);
        return {
          output: { form },
          message: `Retrieved form **${form.name || form.title || ctx.input.formId}**.`
        };
      }
    }
  })
  .build();
