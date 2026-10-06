import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  contractorId: z.string().describe('UUID of the contractor'),
  companyId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  businessName: z.string().nullable().optional().describe('Business name'),
  email: z.string().nullable().optional().describe('Email address'),
  type: z.string().nullable().optional().describe('Contractor type'),
  wageType: z.string().nullable().optional().describe('Wage type'),
  isActive: z.boolean().nullable().optional().describe('Whether the contractor is active'),
  version: z.string().nullable().optional().describe('Current resource version')
});

export let manageContractor = SlateTool.create(spec, {
  name: 'Manage Contractor',
  key: 'manage_contractor',
  description: `Create, retrieve, or update a contractor (1099 worker).
- To **create**: provide companyId, type, and contractor details.
- To **get**: provide contractorId.
- To **update**: provide contractorId and fields to change.`,
  instructions: [
    'For individual contractors, provide firstName and lastName.',
    'For business contractors, provide businessName.',
    'The version field is required for updates (optimistic locking).'
  ]
})
  .input(
    z.object({
      hourlyRate: z
        .string()
        .optional()
        .describe('Exact decimal hourly rate, required when wageType is Hourly.'),
      action: z.enum(['create', 'get', 'update']).describe('The action to perform'),
      companyId: companyIdSchema.optional(),
      contractorId: z
        .string()
        .optional()
        .describe('Contractor UUID (required for get/update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      type: z.enum(['Individual', 'Business']).optional().describe('Contractor type'),
      firstName: z.string().optional().describe('First name (individual contractors)'),
      lastName: z.string().optional().describe('Last name (individual contractors)'),
      businessName: z.string().optional().describe('Business name (business contractors)'),
      email: z.string().optional().describe('Email address'),
      wageType: z.enum(['Fixed', 'Hourly']).optional().describe('Wage type'),
      startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
      ssn: z.string().optional().describe('SSN or EIN for the contractor')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('manage_contractor', ctx.input, ctx.auth, outputSchema))
  .build();
