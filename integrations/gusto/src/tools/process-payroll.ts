import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let processPayroll = SlateTool.create(spec, {
  name: 'Process Payroll',
  key: 'process_payroll',
  description: `Calculate or submit a payroll for processing. Use **calculate** to compute gross-to-net calculations for a payroll. Use **submit** to finalize and submit the payroll for processing (irreversible). Payrolls must be calculated before they can be submitted.`,
  instructions: [
    'A payroll must be in "unprocessed" status to calculate.',
    'A payroll must be in "calculated" status to submit.',
    'Submitting a payroll is irreversible — ensure calculations are reviewed first.'
  ],
  constraints: ['Payroll submission is a destructive operation that cannot be undone.'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The UUID of the company'),
      payrollId: z.string().describe('The UUID of the payroll'),
      action: z
        .enum(['calculate', 'submit'])
        .describe('Whether to calculate or submit the payroll')
    })
  )
  .output(
    z.object({
      payrollId: z.string().describe('UUID of the payroll'),
      processingStatus: z.string().optional().describe('Updated processing status'),
      checkDate: z.string().optional().describe('Date employees are paid'),
      totals: z.any().optional().describe('Payroll totals after calculation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let result: any;
    if (ctx.input.action === 'calculate') {
      result = await client.calculatePayroll(ctx.input.companyId, ctx.input.payrollId);
    } else {
      result = await client.submitPayroll(ctx.input.companyId, ctx.input.payrollId);
    }

    return {
      output: {
        payrollId: result.payroll_uuid || result.uuid || result.id?.toString(),
        processingStatus: result.processing_status,
        checkDate: result.check_date,
        totals: result.totals
      },
      message: `Payroll ${ctx.input.payrollId} has been **${ctx.input.action === 'calculate' ? 'calculated' : 'submitted'}** (status: ${result.processing_status || 'pending'}).`
    };
  })
  .build();
