import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { reportOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Retrieves a completed GTmetrix performance report by its report ID or test ID. Returns full performance metrics including grades, scores, Core Web Vitals (LCP, TBT, CLS), timing data, page weight, and links to resources like HAR files, screenshots, and videos. When a test ID is provided, the tool polls for test completion before fetching the report.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reportId: z
        .string()
        .optional()
        .describe('The report ID to retrieve. Provide either reportId or testId.'),
      testId: z
        .string()
        .optional()
        .describe(
          'The test ID to poll and retrieve the report for. Provide either reportId or testId.'
        )
    })
  )
  .output(reportOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let reportId = ctx.input.reportId;

    if (ctx.input.testId && !reportId) {
      ctx.info(`Polling test ${ctx.input.testId} for completion`);
      let test = await client.pollTestUntilComplete(ctx.input.testId);

      if (test.state === 'error') {
        throw new Error(`Test ${ctx.input.testId} failed: ${test.error ?? 'Unknown error'}`);
      }

      if (!test.reportId) {
        throw new Error(`Test ${ctx.input.testId} completed but no report ID was returned`);
      }

      reportId = test.reportId;
    }

    if (!reportId) {
      throw new Error('Either reportId or testId must be provided');
    }

    let report = await client.getReport(reportId);

    let grade = report.gtmetrixGrade ?? 'N/A';
    let perfScore = report.performanceScore ?? 'N/A';
    let structScore = report.structureScore ?? 'N/A';
    let lcp =
      report.largestContentfulPaint != null ? `${report.largestContentfulPaint}ms` : 'N/A';
    let tbt = report.totalBlockingTime != null ? `${report.totalBlockingTime}ms` : 'N/A';
    let cls = report.cumulativeLayoutShift ?? 'N/A';
    let pageSize =
      report.pageBytes != null ? `${(report.pageBytes / 1024).toFixed(1)}KB` : 'N/A';

    return {
      output: report,
      message: `Report for **${report.url}**:\n- **Grade:** ${grade} | **Performance:** ${perfScore} | **Structure:** ${structScore}\n- **LCP:** ${lcp} | **TBT:** ${tbt} | **CLS:** ${cls}\n- **Page Size:** ${pageSize} | **Requests:** ${report.pageRequests ?? 'N/A'}`
    };
  })
  .build();
