import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let runReport = SlateTool.create(spec, {
  name: 'Run Report',
  key: 'run_report',
  description: `Run an existing Salesforce report and retrieve its results, or list available reports. Optionally pass custom filters to override the report's default filters at runtime. Can also retrieve report metadata to understand available columns and filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['run', 'describe', 'list'])
        .describe(
          'Action to perform: run a report, describe its metadata, or list all reports'
        ),
      reportId: z
        .string()
        .optional()
        .describe('The Salesforce report ID (required for run and describe actions)'),
      reportFilters: z
        .any()
        .optional()
        .describe('Optional runtime filter overrides as a reportMetadata object')
    })
  )
  .output(
    z.object({
      reportResult: z.any().describe('Report execution results, metadata, or list of reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'list') {
      let reports = await client.listReports();
      return {
        output: { reportResult: reports },
        message: `Retrieved **${Array.isArray(reports) ? reports.length : 0}** reports`
      };
    }

    if (!ctx.input.reportId) {
      throw new Error('reportId is required for run and describe actions');
    }

    if (ctx.input.action === 'describe') {
      let metadata = await client.getReportMetadata(ctx.input.reportId);
      return {
        output: { reportResult: metadata },
        message: `Retrieved metadata for report \`${ctx.input.reportId}\``
      };
    }

    let result = await client.runReport(ctx.input.reportId, ctx.input.reportFilters);
    return {
      output: { reportResult: result },
      message: `Executed report \`${ctx.input.reportId}\``
    };
  })
  .build();
