import { SlateTool } from 'slates';
import { z } from 'zod';
import { invokeGusto } from '../lib/actions';
import { companyIdSchema, paginationSchema } from '../lib/schemas';
import { spec } from '../spec';

const outputSchema = z.object({
  pagination: paginationSchema.optional(),
  policies: z
    .array(
      z.object({
        policyId: z.string().describe('UUID of the time off policy'),
        name: z.string().nullable().optional().describe('Policy name'),
        policyType: z
          .string()
          .nullable()
          .optional()
          .describe('Type of policy (vacation, sick, etc.)'),
        accrualMethod: z.string().nullable().optional().describe('Accrual method'),
        accrualRate: z.string().nullable().optional().describe('Accrual rate'),
        accrualPeriod: z.string().nullable().optional().describe('Accrual period'),
        active: z.boolean().nullable().optional().describe('Whether the policy is active')
      })
    )
    .optional()
    .describe('Time off policies (for list_policies)'),
  balances: z
    .array(z.any())
    .optional()
    .describe('Employee time off activities and balances (for get_balances)')
});

export let manageTimeOff = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `List time off policies for a company or retrieve an employee's time off activity for one exact type. Use company policies to identify the exact timeOffType required for get_balances.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      timeOffType: z
        .string()
        .optional()
        .describe(
          'Required for get_balances: exact time-off type name from company policies, such as sick or vacation.'
        ),
      action: z
        .enum(['list_policies', 'get_balances'])
        .describe(
          'list_policies for company policies, get_balances for employee time off activity'
        ),
      companyId: companyIdSchema.optional(),
      employeeId: z.string().optional().describe('Employee UUID (required for get_balances)')
    })
  )
  .output(outputSchema)
  .handleInvocation(ctx => invokeGusto('manage_time_off', ctx.input, ctx.auth, outputSchema))
  .build();
