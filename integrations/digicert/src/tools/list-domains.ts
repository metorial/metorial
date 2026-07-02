import { SlateTool } from 'slates';
import { z } from 'zod';
import { CertCentralClient } from '../lib/client';
import { spec } from '../spec';

let domainSchema = z.object({
  domainId: z.number().describe('Domain ID'),
  name: z.string().describe('Domain name'),
  isActive: z.boolean().optional().describe('Whether the domain is active'),
  dateCreated: z.string().optional().describe('Date the domain was created'),
  organizationId: z.number().optional().describe('Associated organization ID'),
  organizationName: z.string().optional().describe('Associated organization name'),
  validations: z
    .array(
      z.object({
        type: z.string().describe('Validation type (e.g., "ov", "ev")'),
        status: z.string().describe('Validation status'),
        dateCreated: z.string().optional(),
        expiresAt: z.string().optional()
      })
    )
    .optional()
    .describe('Domain validation status per validation type'),
  dcvStatus: z.string().optional().describe('Domain control validation status')
});

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `List all domains in your DigiCert CertCentral account. Optionally include validation status for each domain.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeValidation: z
        .boolean()
        .optional()
        .describe('Include validation status for each domain'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      domains: z.array(domainSchema).describe('List of domains'),
      totalCount: z.number().describe('Total number of domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CertCentralClient({
      token: ctx.auth.token,
      platform: ctx.config.platform
    });

    let result = await client.listDomains({
      offset: ctx.input.offset,
      limit: ctx.input.limit,
      include_validation: ctx.input.includeValidation
    });

    let domains = (result.domains || []).map((d: any) => ({
      domainId: d.id,
      name: d.name,
      isActive: d.is_active,
      dateCreated: d.date_created,
      organizationId: d.organization?.id,
      organizationName: d.organization?.name,
      validations: d.validations?.map((v: any) => ({
        type: v.type,
        status: v.status,
        dateCreated: v.date_created,
        expiresAt: v.expires_at
      })),
      dcvStatus: d.dcv_status
    }));

    let totalCount = result.page?.total || domains.length;

    return {
      output: { domains, totalCount },
      message: `Found **${totalCount}** domain(s).`
    };
  })
  .build();
