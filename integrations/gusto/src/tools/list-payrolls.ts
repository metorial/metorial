import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let listPayrolls = SlateTool.create(spec, {
  name: 'List Payrolls',
  key: 'list_payrolls',
  description: `List payrolls for a company. Can filter by processing status and date range. Returns payroll summaries including pay period, status, and totals.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The UUID of the company'),
      processingStatuses: z
        .array(z.enum(['unprocessed', 'calculated', 'submitted', 'processed', 'paid']))
        .optional()
        .describe('Filter by processing status(es)'),
      startDate: z
        .string()
        .optional()
        .describe('Filter payrolls on or after this date (YYYY-MM-DD)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter payrolls on or before this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination'),
      per: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      payrolls: z
        .array(
          z.object({
            payrollId: z.string().describe('UUID of the payroll'),
            payPeriodStartDate: z.string().optional().describe('Start date of the pay period'),
            payPeriodEndDate: z.string().optional().describe('End date of the pay period'),
            checkDate: z.string().optional().describe('Date employees are paid'),
            processed: z.boolean().optional().describe('Whether payroll has been processed'),
            processingStatus: z.string().optional().describe('Processing status'),
            payrollType: z
              .string()
              .optional()
              .describe('Type of payroll (regular, off_cycle, etc.)'),
            totalGrossPay: z.string().optional().describe('Total gross pay amount'),
            totalNetPay: z.string().optional().describe('Total net pay amount'),
            totalEmployerTaxes: z.string().optional().describe('Total employer taxes'),
            totalEmployeeTaxes: z.string().optional().describe('Total employee taxes')
          })
        )
        .describe('List of payrolls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let params: Record<string, any> = {};
    if (ctx.input.processingStatuses?.length) {
      params['processing_statuses[]'] = ctx.input.processingStatuses;
    }
    if (ctx.input.startDate) params.start_date = ctx.input.startDate;
    if (ctx.input.endDate) params.end_date = ctx.input.endDate;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.per) params.per = ctx.input.per;

    let result = await client.listPayrolls(ctx.input.companyId, params);
    let payrolls = Array.isArray(result) ? result : result.payrolls || result;

    let mapped = payrolls.map((p: any) => ({
      payrollId: p.payroll_uuid || p.uuid || p.id?.toString(),
      payPeriodStartDate: p.pay_period?.start_date,
      payPeriodEndDate: p.pay_period?.end_date,
      checkDate: p.check_date,
      processed: p.processed,
      processingStatus: p.processing_status,
      payrollType: p.payroll_type,
      totalGrossPay: p.totals?.gross_pay,
      totalNetPay: p.totals?.net_pay,
      totalEmployerTaxes: p.totals?.employer_taxes,
      totalEmployeeTaxes: p.totals?.employee_taxes
    }));

    return {
      output: { payrolls: mapped },
      message: `Found **${mapped.length}** payroll(s) for company ${ctx.input.companyId}.`
    };
  })
  .build();
