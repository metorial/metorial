import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

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
      companyId: z.string().describe('The UUID of the company to retrieve')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('UUID of the company'),
      name: z.string().optional().describe('Company name'),
      tradeName: z.string().optional().describe('Company trade name'),
      ein: z.string().optional().describe('Employer Identification Number'),
      entityType: z.string().optional().describe('Entity type (e.g., LLC, S-Corporation)'),
      companyStatus: z.string().optional().describe('Current status of the company'),
      tier: z.string().optional().describe('Gusto subscription tier'),
      isSuspended: z.boolean().optional().describe('Whether the company is suspended'),
      locations: z.array(z.any()).optional().describe('Company locations'),
      primaryPayroll: z.any().optional().describe('Primary payroll information'),
      primarySignatory: z.any().optional().describe('Primary signatory information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let company = await client.getCompany(ctx.input.companyId);

    return {
      output: {
        companyId: company.uuid || company.id?.toString(),
        name: company.name,
        tradeName: company.trade_name,
        ein: company.ein,
        entityType: company.entity_type,
        companyStatus: company.company_status,
        tier: company.tier,
        isSuspended: company.is_suspended,
        locations: company.locations,
        primaryPayroll: company.primary_payroll,
        primarySignatory: company.primary_signatory
      },
      message: `Retrieved company **${company.name || company.trade_name || ctx.input.companyId}** (status: ${company.company_status || 'unknown'}).`
    };
  })
  .build();
