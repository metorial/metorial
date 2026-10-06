import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  forms: z
    .array(
      z.object({
        formId: z.string().describe('UUID of the form'),
        draft: z.boolean().nullable().optional(),
        quarter: z.number().nullable().optional(),
        employeeId: z.string().nullable().optional(),
        name: z.string().nullable().optional().describe('Form name or type'),
        title: z.string().nullable().optional().describe('Form title'),
        description: z.string().nullable().optional().describe('Form description'),
        formType: z
          .string()
          .nullable()
          .optional()
          .describe('Type of form (w2, w4, 1099, i9, etc.)'),
        year: z.number().nullable().optional().describe('Tax year'),
        signed: z.boolean().nullable().optional().describe('Whether the form has been signed'),
        requiresSigning: z
          .boolean()
          .nullable()
          .optional()
          .describe('Whether the form requires signing')
      })
    )
    .optional()
    .describe('List of forms'),
  form: z.any().optional().describe('Single form details (for scope=single)')
});

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List company or employee form metadata, or retrieve one form by ID. These endpoints require an approved Embedded Payroll application and company_forms:read or employee_forms:read. No form content or signing operation is returned.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scope: z
        .enum(['company', 'employee', 'single'])
        .describe('Whether to list company forms, employee forms, or get a single form'),
      companyId: companyIdSchema.optional(),
      employeeId: z
        .string()
        .optional()
        .describe('Employee UUID (required for scope=employee)'),
      formId: z.string().optional().describe('Form UUID (required for scope=single)')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('list_forms', ctx.input, ctx.auth, outputSchema))
  .build();
