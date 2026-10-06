import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  contractors: z
    .array(
      z.object({
        contractorId: z.string().describe('UUID of the contractor'),
        version: z.string().nullable().optional(),
        companyId: z.string().nullable().optional(),
        firstName: z
          .string()
          .nullable()
          .optional()
          .describe('First name (individual contractors)'),
        lastName: z
          .string()
          .nullable()
          .optional()
          .describe('Last name (individual contractors)'),
        businessName: z
          .string()
          .nullable()
          .optional()
          .describe('Business name (business contractors)'),
        email: z.string().nullable().optional().describe('Email address'),
        type: z
          .string()
          .nullable()
          .optional()
          .describe('Contractor type (Individual or Business)'),
        wageType: z.string().nullable().optional().describe('Wage type (Fixed or Hourly)'),
        isActive: z
          .boolean()
          .nullable()
          .optional()
          .describe('Whether the contractor is active'),
        onboardingStatus: z.string().nullable().optional().describe('Onboarding status')
      })
    )
    .describe('List of contractors')
});

export let listContractors = SlateTool.create(spec, {
  name: 'List Contractors',
  key: 'list_contractors',
  description: `List contractors (1099 workers) for a company. Returns contractor profiles including names, types, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: companyIdSchema,
      page: z.number().optional().describe('Page number for pagination'),
      per: z.number().optional().describe('Number of results per page')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('list_contractors', ctx.input, ctx.auth, outputSchema))
  .build();
