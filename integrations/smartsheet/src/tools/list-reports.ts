import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List all reports accessible to the current user, or get the full data for a specific report. Reports aggregate data from multiple sheets and are read-only.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      reportId: z
        .string()
        .optional()
        .describe('Get a specific report by ID. If omitted, lists all reports.'),
      page: z.number().optional().describe('Page number for report data pagination'),
      pageSize: z.number().optional().describe('Number of rows per page for report data')
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportId: z.number().describe('Report ID'),
            name: z.string().describe('Report name'),
            accessLevel: z.string().optional().describe('Access level'),
            permalink: z.string().optional().describe('URL to the report')
          })
        )
        .optional()
        .describe('List of reports'),
      report: z
        .object({
          reportId: z.number().describe('Report ID'),
          name: z.string().describe('Report name'),
          columns: z
            .array(
              z.object({
                virtualColumnId: z.number().optional().describe('Virtual column ID'),
                title: z.string().describe('Column title'),
                type: z.string().optional().describe('Column type')
              })
            )
            .optional()
            .describe('Report columns'),
          rows: z
            .array(
              z.object({
                rowId: z.number().describe('Row ID'),
                sheetId: z.number().optional().describe('Source sheet ID'),
                cells: z
                  .array(
                    z.object({
                      virtualColumnId: z.number().optional().describe('Virtual column ID'),
                      value: z.any().optional().describe('Cell value'),
                      displayValue: z.string().optional().describe('Display value')
                    })
                  )
                  .describe('Cell data')
              })
            )
            .optional()
            .describe('Report rows'),
          totalRowCount: z.number().optional().describe('Total rows in the report')
        })
        .optional()
        .describe('Full report data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.reportId) {
      let report = await client.getReport(ctx.input.reportId, {
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });

      return {
        output: {
          report: {
            reportId: report.id,
            name: report.name,
            columns: (report.columns || []).map((c: any) => ({
              virtualColumnId: c.virtualId,
              title: c.title,
              type: c.type
            })),
            rows: (report.rows || []).map((r: any) => ({
              rowId: r.id,
              sheetId: r.sheetId,
              cells: (r.cells || []).map((c: any) => ({
                virtualColumnId: c.virtualColumnId,
                value: c.value,
                displayValue: c.displayValue
              }))
            })),
            totalRowCount: report.totalRowCount
          }
        },
        message: `Retrieved report **${report.name}** with ${(report.rows || []).length} row(s).`
      };
    }

    let result = await client.listReports({ includeAll: true });
    let reports = (result.data || []).map((r: any) => ({
      reportId: r.id,
      name: r.name,
      accessLevel: r.accessLevel,
      permalink: r.permalink
    }));

    return {
      output: { reports },
      message: `Found **${reports.length}** report(s).`
    };
  })
  .build();
