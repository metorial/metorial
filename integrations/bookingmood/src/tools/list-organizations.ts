import { SlateTool } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Connected Organizations',
  key: 'list_organizations',
  description:
    'Identifies the organization accounts visible to the connected API key, including their IDs, localized names, company names, and active status.',
  constraints: ['Maximum 1000 results per request.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of organizations'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Number of organizations to skip')
    })
  )
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.string().describe('Organization ID for resource filtering'),
          name: z
            .record(z.string(), z.string())
            .describe('Organization name by language, including default'),
          companyName: z.string().describe('Company name'),
          countryCode: z.string().describe('Country code'),
          active: z.boolean().describe('Whether the organization is active'),
          createdAt: z.string().describe('Creation timestamp'),
          updatedAt: z.string().describe('Last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BookingmoodClient(ctx.auth.token);
    let organizations = await client.listOrganizations({
      select: 'id,name,company_name,country_code,active,created_at,updated_at',
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    return {
      output: {
        organizations: organizations.map(organization => ({
          organizationId: organization.id,
          name: organization.name,
          companyName: organization.company_name,
          countryCode: organization.country_code,
          active: organization.active,
          createdAt: organization.created_at,
          updatedAt: organization.updated_at
        }))
      },
      message: `Found **${organizations.length}** connected organization(s).`
    };
  })
  .build();
