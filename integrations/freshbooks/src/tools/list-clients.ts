import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    clients: z.array(
      z.object({
        clientId: z.number().describe('Unique client ID'),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        organization: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        phone: z.string().nullable().optional(),
        currencyCode: z.string().nullable().optional()
      })
    ),
    totalCount: z.number().describe('Total number of matching clients'),
    currentPage: z.number().describe('Current page number'),
    totalPages: z.number().describe('Total number of pages')
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let listClients = SlateTool.create(spec, {
  name: 'List Clients',
  key: 'list_clients',
  description: `Search and list clients in FreshBooks. Supports filtering by email, organization, and name. Returns paginated results with key contact and billing information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)'),
      searchEmail: z.string().optional().describe('Filter by email address'),
      searchOrganization: z.string().optional().describe('Filter by organization name'),
      searchFirstName: z.string().optional().describe('Filter by first name'),
      searchLastName: z.string().optional().describe('Filter by last name')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('list_clients', ctx, outputSchema))
  .build();
