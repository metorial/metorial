import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let getPayroll = SlateTool.create(spec, {
  name: 'Get Payroll',
  key: 'get_payroll',
  description: `Retrieve detailed information about a specific payroll, including employee compensations, taxes, deductions, and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The UUID of the company'),
      payrollId: z.string().describe('The UUID of the payroll')
    })
  )
  .output(
    z.object({
      payrollId: z.string().describe('UUID of the payroll'),
      payPeriodStartDate: z.string().optional().describe('Start date of the pay period'),
      payPeriodEndDate: z.string().optional().describe('End date of the pay period'),
      checkDate: z.string().optional().describe('Date employees are paid'),
      processed: z.boolean().optional().describe('Whether payroll has been processed'),
      processingStatus: z.string().optional().describe('Processing status'),
      payrollType: z.string().optional().describe('Type of payroll'),
      version: z.string().optional().describe('Resource version for optimistic locking'),
      totals: z
        .any()
        .optional()
        .describe('Payroll totals including gross pay, net pay, taxes, etc.'),
      employeeCompensations: z
        .array(z.any())
        .optional()
        .describe('Per-employee compensation details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let payroll = await client.getPayroll(ctx.input.companyId, ctx.input.payrollId);

    return {
      output: {
        payrollId: payroll.payroll_uuid || payroll.uuid || payroll.id?.toString(),
        payPeriodStartDate: payroll.pay_period?.start_date,
        payPeriodEndDate: payroll.pay_period?.end_date,
        checkDate: payroll.check_date,
        processed: payroll.processed,
        processingStatus: payroll.processing_status,
        payrollType: payroll.payroll_type,
        version: payroll.version,
        totals: payroll.totals,
        employeeCompensations: payroll.employee_compensations
      },
      message: `Retrieved payroll for period ${payroll.pay_period?.start_date || 'N/A'} to ${payroll.pay_period?.end_date || 'N/A'} (status: ${payroll.processing_status || 'unknown'}).`
    };
  })
  .build();
