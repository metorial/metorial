import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getJobFinancialsTool = SlateTool.create(spec, {
  name: 'Get Job Financials',
  key: 'get_job_financials',
  description: `Retrieve financial information for a job, including worksheets, amendments, and accounting integration status. Provide a jobId to get the financial summary, or a financialId to get detailed worksheet and amendment data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z
        .string()
        .optional()
        .describe('Job ID to retrieve financial summary and accounting status for'),
      financialId: z
        .string()
        .optional()
        .describe('Financial ID to retrieve detailed financial data'),
      worksheetId: z
        .string()
        .optional()
        .describe('Worksheet ID to retrieve a specific worksheet (requires financialId)'),
      includeAmendments: z
        .boolean()
        .optional()
        .describe('Include financial amendments (requires financialId)'),
      includeAccountingStatus: z
        .boolean()
        .optional()
        .describe('Include accounting integration sync status (requires jobId)')
    })
  )
  .output(
    z.object({
      financials: z.record(z.string(), z.any()).optional().describe('Job financial summary'),
      financial: z.record(z.string(), z.any()).optional().describe('Detailed financial data'),
      worksheet: z.record(z.string(), z.any()).optional().describe('Specific worksheet data'),
      amendments: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Financial amendments'),
      accountingStatus: z
        .record(z.string(), z.any())
        .optional()
        .describe('Accounting integration sync status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let parts: string[] = [];
    let financials: any;
    let financial: any;
    let worksheet: any;
    let amendments: any;
    let accountingStatus: any;

    if (ctx.input.jobId) {
      financials = await client.getJobFinancials(ctx.input.jobId);
      parts.push('financial summary');

      if (ctx.input.includeAccountingStatus) {
        try {
          accountingStatus = await client.getAccountingIntegrationStatus(ctx.input.jobId);
          parts.push('accounting status');
        } catch (_e) {
          /* optional */
        }
      }
    }

    if (ctx.input.financialId) {
      financial = await client.getFinancial(ctx.input.financialId);
      parts.push('financial details');

      if (ctx.input.worksheetId) {
        worksheet = await client.getWorksheet(ctx.input.financialId, ctx.input.worksheetId);
        parts.push('worksheet');
      }

      if (ctx.input.includeAmendments) {
        try {
          let result = await client.getFinancialAmendments(ctx.input.financialId);
          amendments = Array.isArray(result) ? result : (result?.items ?? result?.data ?? []);
          parts.push(`${amendments.length} amendment(s)`);
        } catch (_e) {
          /* optional */
        }
      }
    }

    return {
      output: { financials, financial, worksheet, amendments, accountingStatus },
      message: `Retrieved ${parts.join(', ') || 'financial data'}.`
    };
  })
  .build();
