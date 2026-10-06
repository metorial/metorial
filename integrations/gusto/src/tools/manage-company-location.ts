import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  locations: z
    .array(
      z.object({
        locationId: z.string().describe('UUID of the location'),
        version: z.string().nullable().optional(),
        companyId: z.string().nullable().optional(),
        street1: z.string().nullable().optional().describe('Street address line 1'),
        street2: z.string().nullable().optional().describe('Street address line 2'),
        city: z.string().nullable().optional().describe('City'),
        state: z.string().nullable().optional().describe('State'),
        zip: z.string().nullable().optional().describe('ZIP code'),
        phoneNumber: z.string().nullable().optional().describe('Phone number'),
        active: z.boolean().nullable().optional().describe('Whether the location is active')
      })
    )
    .optional()
    .describe('List of locations'),
  location: z
    .object({
      locationId: z.string().describe('UUID of the location'),
      companyId: z.string().nullable().optional(),
      street1: z.string().nullable().optional().describe('Street address line 1'),
      city: z.string().nullable().optional().describe('City'),
      state: z.string().nullable().optional().describe('State'),
      zip: z.string().nullable().optional().describe('ZIP code'),
      version: z.string().nullable().optional().describe('Current resource version')
    })
    .optional()
    .describe('Created or updated location')
});

export let manageCompanyLocation = SlateTool.create(spec, {
  name: 'Manage Company Location',
  key: 'manage_company_location',
  description: `List, create, or update company locations. Locations are used for tax jurisdiction purposes and employee work addresses.`
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for list, starting at 1.'),
      per: z.number().optional().describe('Results per list page, 1 to 100.'),
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      companyId: companyIdSchema.optional(),
      locationId: z.string().optional().describe('Location UUID (required for update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      phoneNumber: z.string().optional().describe('Phone number for the location'),
      street1: z.string().optional().describe('Street address line 1'),
      street2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State abbreviation (e.g., CA, NY)'),
      zip: z.string().optional().describe('ZIP code'),
      country: z.string().optional().describe('Country (defaults to USA)'),
      mailingAddress: z.boolean().optional().describe('Whether this is a mailing address'),
      filingAddress: z.boolean().optional().describe('Whether this is a filing address')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx =>
    invokeGusto('manage_company_location', ctx.input, ctx.auth, outputSchema)
  )
  .build();
