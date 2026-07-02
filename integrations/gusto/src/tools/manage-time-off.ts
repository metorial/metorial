import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `List time off policies for a company or retrieve an employee's time off balances and activity. Use this to check available PTO, sick leave, or custom time off types.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list_policies', 'get_balances'])
        .describe(
          'list_policies for company policies, get_balances for employee time off activity'
        ),
      companyId: z.string().optional().describe('Company UUID (required for list_policies)'),
      employeeId: z.string().optional().describe('Employee UUID (required for get_balances)')
    })
  )
  .output(
    z.object({
      policies: z
        .array(
          z.object({
            policyId: z.string().describe('UUID of the time off policy'),
            name: z.string().optional().describe('Policy name'),
            policyType: z
              .string()
              .optional()
              .describe('Type of policy (vacation, sick, etc.)'),
            accrualMethod: z.string().optional().describe('Accrual method'),
            accrualRate: z.string().optional().describe('Accrual rate'),
            accrualPeriod: z.string().optional().describe('Accrual period'),
            active: z.boolean().optional().describe('Whether the policy is active')
          })
        )
        .optional()
        .describe('Time off policies (for list_policies)'),
      balances: z
        .array(z.any())
        .optional()
        .describe('Employee time off activities and balances (for get_balances)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    switch (ctx.input.action) {
      case 'list_policies': {
        if (!ctx.input.companyId) throw new Error('companyId is required');
        let result = await client.listTimeOffPolicies(ctx.input.companyId);
        let policies = Array.isArray(result) ? result : result.time_off_policies || result;
        let mapped = policies.map((p: any) => ({
          policyId: p.uuid || p.id?.toString(),
          name: p.name,
          policyType: p.policy_type,
          accrualMethod: p.accrual_method,
          accrualRate: p.accrual_rate,
          accrualPeriod: p.accrual_period,
          active: p.active
        }));
        return {
          output: { policies: mapped },
          message: `Found **${mapped.length}** time off policy/policies.`
        };
      }
      case 'get_balances': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        let result = await client.getTimeOffBalances(ctx.input.employeeId);
        let balances = Array.isArray(result) ? result : result.time_off_activities || [result];
        return {
          output: { balances },
          message: `Retrieved time off balances for employee ${ctx.input.employeeId}.`
        };
      }
    }
  })
  .build();
