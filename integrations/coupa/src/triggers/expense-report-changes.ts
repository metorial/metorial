import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { CoupaClient } from '../lib/client';
import { spec } from '../spec';

export let expenseReportChanges = SlateTrigger.create(spec, {
  name: 'Expense Report Changes',
  key: 'expense_report_changes',
  description:
    'Triggers when expense reports are created, submitted, approved, or otherwise updated in Coupa.'
})
  .input(
    z.object({
      expenseReportId: z.number().describe('Expense report ID'),
      title: z.string().nullable().optional().describe('Expense report title'),
      status: z.string().nullable().optional().describe('Current status'),
      updatedAt: z.string().describe('Last update timestamp'),
      rawData: z.any().describe('Full expense report data')
    })
  )
  .output(
    z.object({
      expenseReportId: z.number().describe('Coupa expense report ID'),
      title: z.string().nullable().optional().describe('Expense report title'),
      status: z.string().nullable().optional().describe('Current status'),
      expenseReportNumber: z.string().nullable().optional().describe('Report number'),
      submittedBy: z.any().nullable().optional().describe('Submitting user'),
      totalAmount: z.any().nullable().optional().describe('Total amount'),
      currency: z.any().nullable().optional().describe('Currency'),
      expenseLines: z.array(z.any()).nullable().optional().describe('Expense line items'),
      createdAt: z.string().nullable().optional().describe('Creation timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new CoupaClient({
        token: ctx.auth.token,
        instanceUrl: ctx.config.instanceUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let filters: Record<string, string> = {};

      if (lastPollTime) {
        filters['updated-at[gt]'] = lastPollTime;
      }

      let results = await client.listExpenseReports({
        filters,
        orderBy: 'updated_at',
        dir: 'asc',
        limit: 50
      });

      let reports = Array.isArray(results) ? results : [];

      let newLastPollTime = lastPollTime;
      if (reports.length > 0) {
        let lastReport = reports[reports.length - 1];
        newLastPollTime = lastReport['updated-at'] ?? lastReport.updated_at ?? lastPollTime;
      }

      return {
        inputs: reports.map((er: any) => ({
          expenseReportId: er.id,
          title: er.title ?? null,
          status: er.status ?? null,
          updatedAt: er['updated-at'] ?? er.updated_at ?? '',
          rawData: er
        })),
        updatedState: {
          lastPollTime: newLastPollTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let er = ctx.input.rawData;

      return {
        type: 'expense_report.updated',
        id: `er-${ctx.input.expenseReportId}-${ctx.input.updatedAt}`,
        output: {
          expenseReportId: ctx.input.expenseReportId,
          title: ctx.input.title,
          status: ctx.input.status,
          expenseReportNumber: er['expense-report-number'] ?? er.expense_report_number ?? null,
          submittedBy: er['submitted-by'] ?? er.submitted_by ?? null,
          totalAmount: er.total ?? er.total ?? null,
          currency: er.currency ?? null,
          expenseLines: er['expense-lines'] ?? er.expense_lines ?? null,
          createdAt: er['created-at'] ?? er.created_at ?? null,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
