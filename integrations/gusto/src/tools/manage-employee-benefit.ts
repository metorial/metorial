import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageEmployeeBenefit = SlateTool.create(spec, {
  name: 'Manage Employee Benefit',
  key: 'manage_employee_benefit',
  description: `List, create, or update employee benefit enrollments. Enrolls employees in company-defined benefit plans with specified contribution amounts and deduction settings.`,
  instructions: [
    'To create an enrollment, provide employeeId, companyBenefitId, and contribution amounts.',
    'To update, provide employeeBenefitId and the fields to change.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update']).describe('The action to perform'),
      employeeId: z.string().optional().describe('Employee UUID (required for list/create)'),
      employeeBenefitId: z
        .string()
        .optional()
        .describe('Employee benefit UUID (required for update)'),
      companyBenefitId: z
        .string()
        .optional()
        .describe('Company benefit UUID (required for create)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      active: z.boolean().optional().describe('Whether the enrollment is active'),
      employeeDeduction: z
        .string()
        .optional()
        .describe('Employee deduction amount per pay period'),
      companyContribution: z
        .string()
        .optional()
        .describe('Company contribution amount per pay period'),
      employeeDeductionAnnualMaximum: z
        .string()
        .optional()
        .describe('Annual maximum employee deduction'),
      companyContributionAnnualMaximum: z
        .string()
        .optional()
        .describe('Annual maximum company contribution'),
      deductAsPercentage: z
        .boolean()
        .optional()
        .describe('Whether to deduct as a percentage of pay'),
      contributeAsPercentage: z
        .boolean()
        .optional()
        .describe('Whether company contributes as a percentage'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Effective date for the benefit change (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      enrollments: z
        .array(
          z.object({
            employeeBenefitId: z.string().describe('UUID of the employee benefit enrollment'),
            companyBenefitId: z.string().optional().describe('UUID of the company benefit'),
            employeeId: z.string().optional().describe('UUID of the employee'),
            active: z.boolean().optional().describe('Whether active'),
            employeeDeduction: z.string().optional().describe('Employee deduction amount'),
            companyContribution: z.string().optional().describe('Company contribution amount')
          })
        )
        .optional()
        .describe('List of enrollments (for list action)'),
      enrollment: z
        .object({
          employeeBenefitId: z.string().describe('UUID of the employee benefit enrollment'),
          companyBenefitId: z.string().optional().describe('UUID of the company benefit'),
          active: z.boolean().optional().describe('Whether active'),
          employeeDeduction: z.string().optional().describe('Employee deduction amount'),
          companyContribution: z.string().optional().describe('Company contribution amount'),
          version: z.string().optional().describe('Current resource version')
        })
        .optional()
        .describe('Single enrollment (for create/update)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.listEmployeeBenefits(ctx.input.employeeId);
        let enrollments = Array.isArray(result) ? result : result.employee_benefits || result;
        let mapped = enrollments.map((e: any) => ({
          employeeBenefitId: e.uuid || e.id?.toString(),
          companyBenefitId: e.company_benefit_uuid || e.company_benefit_id?.toString(),
          employeeId: e.employee_uuid || e.employee_id?.toString(),
          active: e.active,
          employeeDeduction: e.employee_deduction,
          companyContribution: e.company_contribution
        }));
        return {
          output: { enrollments: mapped },
          message: `Found **${mapped.length}** benefit enrollment(s).`
        };
      }
      case 'create': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.createEmployeeBenefit(ctx.input.employeeId, {
          company_benefit_uuid: ctx.input.companyBenefitId,
          active: ctx.input.active,
          employee_deduction: ctx.input.employeeDeduction,
          company_contribution: ctx.input.companyContribution,
          employee_deduction_annual_maximum: ctx.input.employeeDeductionAnnualMaximum,
          company_contribution_annual_maximum: ctx.input.companyContributionAnnualMaximum,
          deduct_as_percentage: ctx.input.deductAsPercentage,
          contribute_as_percentage: ctx.input.contributeAsPercentage,
          effective_date: ctx.input.effectiveDate
        });
        return {
          output: {
            enrollment: {
              employeeBenefitId: result.uuid || result.id?.toString(),
              companyBenefitId: result.company_benefit_uuid,
              active: result.active,
              employeeDeduction: result.employee_deduction,
              companyContribution: result.company_contribution,
              version: result.version
            }
          },
          message: `Created benefit enrollment for employee ${ctx.input.employeeId}.`
        };
      }
      case 'update': {
        if (!ctx.input.employeeBenefitId) throw new Error('employeeBenefitId is required');
        let data: Record<string, any> = {};
        if (ctx.input.version) data.version = ctx.input.version;
        if (ctx.input.active !== undefined) data.active = ctx.input.active;
        if (ctx.input.employeeDeduction) data.employee_deduction = ctx.input.employeeDeduction;
        if (ctx.input.companyContribution)
          data.company_contribution = ctx.input.companyContribution;
        if (ctx.input.employeeDeductionAnnualMaximum)
          data.employee_deduction_annual_maximum = ctx.input.employeeDeductionAnnualMaximum;
        if (ctx.input.companyContributionAnnualMaximum)
          data.company_contribution_annual_maximum =
            ctx.input.companyContributionAnnualMaximum;
        if (ctx.input.deductAsPercentage !== undefined)
          data.deduct_as_percentage = ctx.input.deductAsPercentage;
        if (ctx.input.contributeAsPercentage !== undefined)
          data.contribute_as_percentage = ctx.input.contributeAsPercentage;
        if (ctx.input.effectiveDate) data.effective_date = ctx.input.effectiveDate;
        let result = await client.updateEmployeeBenefit(ctx.input.employeeBenefitId, data);
        return {
          output: {
            enrollment: {
              employeeBenefitId: result.uuid || result.id?.toString(),
              companyBenefitId: result.company_benefit_uuid,
              active: result.active,
              employeeDeduction: result.employee_deduction,
              companyContribution: result.company_contribution,
              version: result.version
            }
          },
          message: `Updated benefit enrollment ${ctx.input.employeeBenefitId}.`
        };
      }
    }
  })
  .build();
