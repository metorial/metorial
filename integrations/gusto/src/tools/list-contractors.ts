import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

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
      companyId: z.string().describe('The UUID of the company'),
      page: z.number().optional().describe('Page number for pagination'),
      per: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      contractors: z
        .array(
          z.object({
            contractorId: z.string().describe('UUID of the contractor'),
            firstName: z.string().optional().describe('First name (individual contractors)'),
            lastName: z.string().optional().describe('Last name (individual contractors)'),
            businessName: z
              .string()
              .optional()
              .describe('Business name (business contractors)'),
            email: z.string().optional().describe('Email address'),
            type: z.string().optional().describe('Contractor type (Individual or Business)'),
            wageType: z.string().optional().describe('Wage type (Fixed or Hourly)'),
            isActive: z.boolean().optional().describe('Whether the contractor is active'),
            onboardingStatus: z.string().optional().describe('Onboarding status')
          })
        )
        .describe('List of contractors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let params: Record<string, any> = {};
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.per) params.per = ctx.input.per;

    let result = await client.listContractors(ctx.input.companyId, params);
    let contractors = Array.isArray(result) ? result : result.contractors || result;

    let mapped = contractors.map((c: any) => ({
      contractorId: c.uuid || c.id?.toString(),
      firstName: c.first_name,
      lastName: c.last_name,
      businessName: c.business_name,
      email: c.email,
      type: c.type,
      wageType: c.wage_type,
      isActive: c.is_active,
      onboardingStatus: c.onboarding_status
    }));

    return {
      output: {
        contractors: mapped
      },
      message: `Found **${mapped.length}** contractor(s) for company ${ctx.input.companyId}.`
    };
  })
  .build();
