import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBenefitsOverview = SlateTool.create(spec, {
  name: 'Get Benefits Overview',
  key: 'get_benefits_overview',
  description: `Retrieve benefits information including benefit plans, deduction types, and optionally benefit coverages and dependents for a specific employee. Provides a comprehensive view of the company's benefits setup.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .optional()
        .describe('If provided, also fetch benefit coverages and dependents for this employee')
    })
  )
  .output(
    z.object({
      deductionTypes: z
        .array(z.record(z.string(), z.any()))
        .describe('Benefit deduction types'),
      plans: z.any().describe('Benefit plans'),
      coverages: z
        .any()
        .optional()
        .describe('Employee benefit coverages (if employeeId provided)'),
      dependents: z.any().optional().describe('Employee dependents (if employeeId provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let [deductionTypes, plans] = await Promise.all([
      client.getBenefitDeductionTypes(),
      client.getBenefitPlans()
    ]);

    let output: any = {
      deductionTypes: Array.isArray(deductionTypes) ? deductionTypes : [],
      plans
    };

    if (ctx.input.employeeId) {
      let [coverages, dependents] = await Promise.all([
        client.getBenefitCoverages(ctx.input.employeeId),
        client.getEmployeeDependents(ctx.input.employeeId)
      ]);
      output.coverages = coverages;
      output.dependents = dependents;
    }

    return {
      output,
      message: ctx.input.employeeId
        ? `Retrieved benefits overview including coverages and dependents for employee **${ctx.input.employeeId}**.`
        : `Retrieved benefits overview with deduction types and plans.`
    };
  })
  .build();
