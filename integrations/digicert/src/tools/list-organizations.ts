import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

let organizationSchema = z.object({
  organizationId: z.number().describe('Organization ID'),
  name: z.string().describe('Organization legal name'),
  displayName: z.string().optional().describe('Display name'),
  isActive: z.boolean().optional().describe('Whether the organization is active'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or province'),
  country: z.string().optional().describe('Country code'),
  address: z.string().optional().describe('Street address'),
  validations: z
    .array(
      z.object({
        type: z.string().describe('Validation type (ov, ev, cs, ev_cs)'),
        status: z.string().describe('Validation status'),
        validatedUntil: z.string().optional().describe('Validation expiry date')
      })
    )
    .optional()
    .describe('Validation status per type')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all organizations in your DigiCert CertCentral account. Optionally include validation status to check which organizations are pre-validated for OV, EV, or code signing certificates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeValidation: z
        .boolean()
        .optional()
        .describe('Include validation status for each organization'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      organizations: z.array(organizationSchema).describe('List of organizations'),
      totalCount: z.number().describe('Total number of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let result = await client.listOrganizations({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      include_validation: ctx.input.includeValidation
    });

    let organizations = (result.organizations || []).map((org: any) => ({
      organizationId: org.id,
      name: org.name,
      displayName: org.display_name,
      isActive: org.is_active,
      city: org.city,
      state: org.state,
      country: org.country,
      address: org.address,
      validations: org.validations?.map((v: any) => ({
        type: v.type,
        status: v.status,
        validatedUntil: v.validated_until
      }))
    }));

    let totalCount = result.page?.total || organizations.length;

    return {
      output: { organizations, totalCount },
      message: `Found **${totalCount}** organization(s).`
    };
  })
  .build();
