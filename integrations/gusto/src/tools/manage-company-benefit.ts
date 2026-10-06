import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  benefits: z
    .array(
      z.object({
        companyBenefitId: z.string().describe('UUID of the company benefit'),
        version: z.string().nullable().optional(),
        companyId: z.string().nullable().optional(),
        benefitType: z.number().nullable().optional().describe('Benefit type ID'),
        description: z.string().nullable().optional().describe('Description'),
        active: z.boolean().nullable().optional().describe('Whether active'),
        name: z.string().nullable().optional().describe('Benefit name')
      })
    )
    .optional()
    .describe('List of company benefits (for list action)'),
  benefit: z
    .object({
      companyBenefitId: z.string().describe('UUID of the company benefit'),
      companyId: z.string().nullable().optional(),
      benefitType: z.number().nullable().optional().describe('Benefit type ID'),
      description: z.string().nullable().optional().describe('Description'),
      active: z.boolean().nullable().optional().describe('Whether active'),
      name: z.string().nullable().optional().describe('Benefit name'),
      version: z.string().nullable().optional().describe('Current resource version')
    })
    .optional()
    .describe('Single benefit (for get/create/update)')
});

export let manageCompanyBenefit = SlateTool.create(spec, {
  name: 'Manage Company Benefit',
  key: 'manage_company_benefit',
  description: `List, create, retrieve, or update company-level benefit types (health insurance, 401(k), HSA, etc.). Company benefits define the benefit plans available to employees.`,
  instructions: [
    'To create, provide companyId, benefitType, and description.',
    'To update, provide companyBenefitId and fields to change.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('The action to perform'),
      companyId: companyIdSchema.optional(),
      companyBenefitId: z
        .string()
        .optional()
        .describe('Company benefit UUID (required for get/update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      benefitType: z.number().optional().describe('Benefit type ID as defined by Gusto'),
      description: z.string().optional().describe('Description of the benefit'),
      active: z.boolean().optional().describe('Whether the benefit is active'),
      responsibleForEmployerTaxes: z
        .boolean()
        .optional()
        .describe('Whether responsible for employer taxes'),
      responsibleForEmployeeW2: z
        .boolean()
        .optional()
        .describe('Whether responsible for employee W-2')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_company_benefit', ctx.input, ctx.auth, outputSchema)
  )
  .build();
