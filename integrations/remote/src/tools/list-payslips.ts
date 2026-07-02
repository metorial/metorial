import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPayslips = SlateTool.create(spec, {
  name: 'List Payslips',
  key: 'list_payslips',
  description: `List payslips for employees. Filter by employment, date range, or pagination. Returns payslip details including period, amounts, and download status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employmentId: z.string().optional().describe('Filter by employment ID'),
      startDate: z.string().optional().describe('Filter payslips from this date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter payslips until this date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Page size')
    })
  )
  .output(
    z.object({
      payslips: z.array(z.record(z.string(), z.any())).describe('List of payslip records'),
      totalCount: z.number().optional().describe('Total number of payslips')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.listPayslips({
      employmentId: ctx.input.employmentId,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let payslips = result?.data ?? result?.payslips ?? [];
    let totalCount = result?.total_count ?? payslips.length;

    return {
      output: {
        payslips,
        totalCount
      },
      message: `Found **${totalCount}** payslip(s).`
    };
  });
