import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let listReports = SlateTool.create(spec, {
  name: 'List Reports',
  key: 'list_reports',
  description: `List all reports in your Mopinion account, or retrieve a specific report by ID. Reports contain metadata such as name, description, language, creation date, and associated datasets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z
        .number()
        .optional()
        .describe('Specific report ID to retrieve. Omit to list all reports.')
    })
  )
  .output(
    z.object({
      reports: z
        .array(
          z.object({
            reportId: z.number().describe('Report ID'),
            name: z.string().describe('Report name'),
            description: z.string().optional().describe('Report description'),
            language: z.string().optional().describe('Report language'),
            created: z.string().optional().describe('Creation date'),
            datasets: z.array(z.any()).optional().describe('Associated datasets')
          })
        )
        .describe('List of reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });

    if (ctx.input.reportId) {
      let report = await client.getReport(ctx.input.reportId);
      let reportData = report.data || report;

      return {
        output: {
          reports: [
            {
              reportId: reportData.id,
              name: reportData.name || '',
              description: reportData.description,
              language: reportData.language,
              created: reportData.created,
              datasets: reportData.datasets || []
            }
          ]
        },
        message: `Retrieved report **${reportData.name}** (ID: ${reportData.id}).`
      };
    }

    let result = await client.getReports();
    let reportsData = Array.isArray(result) ? result : result.data || result.reports || [];

    let reports = reportsData.map((r: any) => ({
      reportId: r.id,
      name: r.name || '',
      description: r.description,
      language: r.language,
      created: r.created,
      datasets: r.datasets || []
    }));

    return {
      output: { reports },
      message: `Retrieved **${reports.length}** reports.`
    };
  })
  .build();
