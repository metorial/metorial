import { SlateTool } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let generateReport = SlateTool.create(spec, {
  name: 'Generate Report',
  key: 'generate_report',
  description: `Generate various Harvest reports: time tracked by project, expenses by project, uninvoiced time and expenses, or project budget consumption. Requires a date range for time, expense, and uninvoiced reports.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportType: z
        .enum(['time', 'expenses', 'uninvoiced', 'project_budget'])
        .describe('Type of report to generate'),
      from: z
        .string()
        .optional()
        .describe('Start date (YYYY-MM-DD, required for time/expenses/uninvoiced)'),
      to: z
        .string()
        .optional()
        .describe('End date (YYYY-MM-DD, required for time/expenses/uninvoiced)'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      reportType: z.string().describe('Type of report generated'),
      results: z.array(z.any()).describe('Report results'),
      totalEntries: z.number().optional().describe('Total entries'),
      totalPages: z.number().optional().describe('Total pages'),
      page: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HarvestClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    if (ctx.input.reportType === 'project_budget') {
      let data = await client.getProjectBudgetReport({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      return {
        output: {
          reportType: 'project_budget',
          results: data.results ?? [],
          totalEntries: data.total_entries,
          totalPages: data.total_pages,
          page: data.page
        },
        message: `Generated project budget report with **${data.results?.length ?? 0}** entries.`
      };
    }

    if (!ctx.input.from || !ctx.input.to) {
      throw new Error(
        'from and to dates are required for time, expenses, and uninvoiced reports'
      );
    }

    if (ctx.input.reportType === 'time') {
      let data = await client.getTimeReport({
        from: ctx.input.from,
        to: ctx.input.to,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      return {
        output: {
          reportType: 'time',
          results: data.results ?? [],
          totalEntries: data.total_entries,
          totalPages: data.total_pages,
          page: data.page
        },
        message: `Generated time report from ${ctx.input.from} to ${ctx.input.to} with **${data.results?.length ?? 0}** entries.`
      };
    }

    if (ctx.input.reportType === 'expenses') {
      let data = await client.getExpenseReport({
        from: ctx.input.from,
        to: ctx.input.to,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      return {
        output: {
          reportType: 'expenses',
          results: data.results ?? [],
          totalEntries: data.total_entries,
          totalPages: data.total_pages,
          page: data.page
        },
        message: `Generated expense report from ${ctx.input.from} to ${ctx.input.to} with **${data.results?.length ?? 0}** entries.`
      };
    }

    // uninvoiced
    let data = await client.getUninvoicedReport({
      from: ctx.input.from,
      to: ctx.input.to,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    return {
      output: {
        reportType: 'uninvoiced',
        results: data.results ?? [],
        totalEntries: data.total_entries,
        totalPages: data.total_pages,
        page: data.page
      },
      message: `Generated uninvoiced report from ${ctx.input.from} to ${ctx.input.to} with **${data.results?.length ?? 0}** entries.`
    };
  })
  .build();
