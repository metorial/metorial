import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  companyId: z.string().describe('UUID of the company'),
  isPartnerManaged: z.boolean().nullable().optional(),
  name: z.string().nullable().optional().describe('Company name'),
  tradeName: z.string().nullable().optional().describe('Company trade name'),
  ein: z.string().nullable().optional().describe('Employer Identification Number'),
  entityType: z
    .string()
    .nullable()
    .optional()
    .describe('Entity type (e.g., LLC, S-Corporation)'),
  companyStatus: z.string().nullable().optional().describe('Current status of the company'),
  tier: z.string().nullable().optional().describe('Gusto subscription tier'),
  isSuspended: z.boolean().nullable().optional().describe('Whether the company is suspended'),
  locations: z.array(z.any()).optional().describe('Company locations'),
  primaryPayroll: z.any().optional().describe('Primary payroll information'),
  primarySignatory: z.any().optional().describe('Primary signatory information')
});

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve detailed information about a Gusto company, including its profile, locations, and configuration. Use this to look up company details by company ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: companyIdSchema
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('get_company', ctx.input, ctx.auth, outputSchema))
  .build();
