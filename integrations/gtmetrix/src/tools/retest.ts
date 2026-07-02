import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { reportOutputSchema, testOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let retest = SlateTool.create(spec, {
  name: 'Retest',
  key: 'retest',
  description: `Re-runs a performance test using the original analysis options from an existing page or report. Useful for tracking performance changes over time without reconfiguring test parameters. Optionally waits for completion and returns the new report.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      pageId: z
        .string()
        .optional()
        .describe('Page ID to retest. Provide either pageId or reportId.'),
      reportId: z
        .string()
        .optional()
        .describe('Report ID to retest. Provide either pageId or reportId.'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'If true, polls until the test completes and returns the full report. Default: false'
        )
    })
  )
  .output(
    z.object({
      test: testOutputSchema,
      report: reportOutputSchema
        .optional()
        .describe(
          'Full report data, only present when waitForCompletion is true and the test completed successfully'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.pageId && !ctx.input.reportId) {
      throw new Error('Either pageId or reportId must be provided');
    }

    let test: any;
    if (ctx.input.pageId) {
      ctx.info(`Retesting page ${ctx.input.pageId}`);
      test = await client.retestPage(ctx.input.pageId);
    } else {
      ctx.info(`Retesting report ${ctx.input.reportId}`);
      test = await client.retestReport(ctx.input.reportId!);
    }

    if (!ctx.input.waitForCompletion) {
      return {
        output: { test },
        message: `Retest **${test.testId}** queued. Credits used: ${test.creditsUsed ?? 'N/A'}, credits remaining: ${test.creditsLeft ?? 'N/A'}.`
      };
    }

    ctx.progress('Waiting for retest to complete...');
    let completedTest = await client.pollTestUntilComplete(test.testId);

    if (completedTest.state === 'error') {
      return {
        output: { test: completedTest },
        message: `Retest **${test.testId}** failed: ${completedTest.error ?? 'Unknown error'}`
      };
    }

    let report = completedTest.reportId
      ? await client.getReport(completedTest.reportId)
      : undefined;

    let grade = report?.gtmetrixGrade ?? 'N/A';
    let perfScore = report?.performanceScore ?? 'N/A';

    return {
      output: { test: completedTest, report },
      message: `Retest completed — Grade: **${grade}**, Performance: **${perfScore}**`
    };
  })
  .build();
