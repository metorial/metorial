import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageCompanyBenefit = SlateTool.create(spec, {
  name: 'Manage Company Benefit',
  key: 'manage_company_benefit',
  description: `List, create, retrieve, or update company-level benefit types (health insurance, 401(k), HSA, etc.). Company benefits define the benefit plans available to employees.`,
  instructions: [
    'To create, provide companyId, benefitType, and description.',
    'To update, provide companyBenefitId and fields to change.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('The action to perform'),
      companyId: z.string().optional().describe('Company UUID (required for list/create)'),
      companyBenefitId: z
        .string()
        .optional()
        .describe('Company benefit UUID (required for get/update)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      benefitType: z.number().optional().describe('Benefit type ID as defined by Gusto'),
      description: z.string().optional().describe('Description of the benefit'),
      active: z.boolean().optional().describe('Whether the benefit is active'),
      responsibleForEmployerTaxes: z
        .boolean()
        .optional()
        .describe('Whether responsible for employer taxes'),
      responsibleForEmployeeW2: z
        .boolean()
        .optional()
        .describe('Whether responsible for employee W-2')
    })
  )
  .output(
    z.object({
      benefits: z
        .array(
          z.object({
            companyBenefitId: z.string().describe('UUID of the company benefit'),
            benefitType: z.number().optional().describe('Benefit type ID'),
            description: z.string().optional().describe('Description'),
            active: z.boolean().optional().describe('Whether active'),
            name: z.string().optional().describe('Benefit name')
          })
        )
        .optional()
        .describe('List of company benefits (for list action)'),
      benefit: z
        .object({
          companyBenefitId: z.string().describe('UUID of the company benefit'),
          benefitType: z.number().optional().describe('Benefit type ID'),
          description: z.string().optional().describe('Description'),
          active: z.boolean().optional().describe('Whether active'),
          name: z.string().optional().describe('Benefit name'),
          version: z.string().optional().describe('Current resource version')
        })
        .optional()
        .describe('Single benefit (for get/create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.listCompanyBenefits(ctx.input.companyId);
        let benefits = Array.isArray(result) ? result : result.company_benefits || result;
        let mapped = benefits.map((b: any) => ({
          companyBenefitId: b.uuid || b.id?.toString(),
          benefitType: b.benefit_type,
          description: b.description,
          active: b.active,
          name: b.name
        }));
        return {
          output: { benefits: mapped },
          message: `Found **${mapped.length}** company benefit(s).`
        };
      }
      case 'get': {
        if (!ctx.input.companyBenefitId) throw new Error('companyBenefitId is required');
        let result = await client.getCompanyBenefit(ctx.input.companyBenefitId);
        return {
          output: {
            benefit: {
              companyBenefitId: result.uuid || result.id?.toString(),
              benefitType: result.benefit_type,
              description: result.description,
              active: result.active,
              name: result.name,
              version: result.version
            }
          },
          message: `Retrieved benefit **${result.name || result.description}**.`
        };
      }
      case 'create': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.createCompanyBenefit(ctx.input.companyId, {
          benefit_type: ctx.input.benefitType,
          description: ctx.input.description,
          active: ctx.input.active,
          responsible_for_employer_taxes: ctx.input.responsibleForEmployerTaxes,
          responsible_for_employee_w2: ctx.input.responsibleForEmployeeW2
        });
        return {
          output: {
            benefit: {
              companyBenefitId: result.uuid || result.id?.toString(),
              benefitType: result.benefit_type,
              description: result.description,
              active: result.active,
              name: result.name,
              version: result.version
            }
          },
          message: `Created company benefit **${result.name || ctx.input.description}**.`
        };
      }
      case 'update': {
        if (!ctx.input.companyBenefitId) throw new Error('companyBenefitId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.description !== undefined) data.description = ctx.input.description;
        if (ctx.input.active !== undefined) data.active = ctx.input.active;
        let result = await client.updateCompanyBenefit(ctx.input.companyBenefitId, data);
        return {
          output: {
            benefit: {
              companyBenefitId: result.uuid || result.id?.toString(),
              benefitType: result.benefit_type,
              description: result.description,
              active: result.active,
              name: result.name,
              version: result.version
            }
          },
          message: `Updated company benefit ${ctx.input.companyBenefitId}.`
        };
      }
    }
  })
  .build();
