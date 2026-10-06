import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getBenefitsOverview = SlateTool.create(spec, {
  name: 'Get Benefits Overview',
  key: 'get_benefits_overview',
  description: `Retrieve visible company benefit plan summaries and deduction types. When employeeId is supplied, also retrieve company coverage levels and dependents for that exact employee. Company coverage levels are not proof of an employee's enrollment.`,
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
        .describe(
          "If provided, also fetch company coverage levels and this employee's dependents"
        )
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
        .describe('Company coverage levels, not employee enrollment (if employeeId provided)'),
      dependents: z.any().optional().describe('Employee dependents (if employeeId provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let [deductionTypes, plans] = await Promise.all([
      client.getBenefitDeductionTypes(),
      client.getBenefitPlans()
    ]);

    let output: {
      deductionTypes: Record<string, unknown>[];
      plans: unknown;
      coverages?: unknown;
      dependents?: unknown;
    } = {
      deductionTypes,
      plans
    };

    if (ctx.input.employeeId) {
      let [coverages, dependents] = await Promise.all([
        client.getBenefitCoverages(),
        client.getEmployeeDependents(ctx.input.employeeId)
      ]);
      output.coverages = coverages;
      output.dependents = dependents;
    }

    return {
      output,
      message: ctx.input.employeeId
        ? `Retrieved company benefit summaries and coverage levels, plus visible dependents for employee **${ctx.input.employeeId}**.`
        : `Retrieved benefits overview with deduction types and plans.`
    };
  })
  .build();
