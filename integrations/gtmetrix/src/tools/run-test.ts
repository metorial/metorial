import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { reportOutputSchema, testOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let runTest = SlateTool.create(spec, {
  name: 'Run Page Speed Test',
  key: 'run_test',
  description: `Runs a GTmetrix page speed test on a given URL and optionally waits for the test to complete. Returns the test status and, if completed, the full report with performance metrics. Supports configuring test location, browser, report type, connection throttling, ad blocking, and more.`,
  instructions: [
    'Set **waitForCompletion** to `true` to poll until the test finishes and receive the full report in one call. Otherwise, only the test ID and initial status are returned.',
    'Use the **List Locations & Browsers** tool to discover valid location and browser IDs.',
    'Throttle format is `"down/up/latency"` in Kbps/Kbps/ms. Common presets: Broadband `"5000/1000/30"`, LTE `"15000/10000/100"`, 3G `"1600/768/200"`.'
  ],
  constraints: [
    'Each test consumes API credits (0.6–1.1 base, plus optional extras for video, retention, PDF).',
    'Basic accounts are limited to 2 concurrent tests; PRO accounts to 8.',
    'Some options (simulateDevice, customDns, userAgent, viewport) require a PRO account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('URL of the page to test'),
      location: z.string().optional().describe('Test server location ID'),
      browser: z.string().optional().describe('Browser ID to use for the test'),
      reportType: z
        .enum(['lighthouse', 'legacy', 'lighthouse,legacy', 'none'])
        .optional()
        .describe('Type of report to generate. Default: lighthouse'),
      retention: z.number().optional().describe('Report retention in months: 1, 6, 12, or 24'),
      adblock: z.boolean().optional().describe('Enable ad blocking during the test'),
      video: z.boolean().optional().describe('Capture a video recording of the page load'),
      stopOnload: z.boolean().optional().describe('Stop the test at the onload event'),
      throttle: z
        .string()
        .optional()
        .describe('Connection throttle as "down/up/latency" in Kbps/Kbps/ms'),
      cookies: z
        .array(z.string())
        .optional()
        .describe('Cookies to set for the test (e.g. ["name=value"])'),
      httpAuthUsername: z
        .string()
        .optional()
        .describe('HTTP authentication username for password-protected pages'),
      httpAuthPassword: z
        .string()
        .optional()
        .describe('HTTP authentication password for password-protected pages'),
      allowUrl: z.array(z.string()).optional().describe('Resource URL whitelist patterns'),
      blockUrl: z.array(z.string()).optional().describe('Resource URL blacklist patterns'),
      simulateDevice: z.string().optional().describe('Simulated device ID (PRO only)'),
      userAgent: z.string().optional().describe('Custom user agent string (PRO only)'),
      browserWidth: z
        .number()
        .optional()
        .describe('Browser viewport width in pixels (PRO only)'),
      browserHeight: z
        .number()
        .optional()
        .describe('Browser viewport height in pixels (PRO only)'),
      browserDppx: z.number().optional().describe('Device pixel ratio, 1-5 (PRO only)'),
      browserRotate: z.boolean().optional().describe('Rotate the device viewport (PRO only)'),
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

    ctx.info(`Starting page speed test for ${ctx.input.url}`);

    let test = await client.startTest({
      url: ctx.input.url,
      location: ctx.input.location,
      browser: ctx.input.browser,
      report: ctx.input.reportType,
      retention: ctx.input.retention,
      adblock: ctx.input.adblock,
      video: ctx.input.video,
      stopOnload: ctx.input.stopOnload,
      throttle: ctx.input.throttle,
      cookies: ctx.input.cookies,
      httpAuthUsername: ctx.input.httpAuthUsername,
      httpAuthPassword: ctx.input.httpAuthPassword,
      allowUrl: ctx.input.allowUrl,
      blockUrl: ctx.input.blockUrl,
      simulateDevice: ctx.input.simulateDevice,
      userAgent: ctx.input.userAgent,
      browserWidth: ctx.input.browserWidth,
      browserHeight: ctx.input.browserHeight,
      browserDppx: ctx.input.browserDppx,
      browserRotate: ctx.input.browserRotate
    });

    ctx.info(`Test ${test.testId} started, credits used: ${test.creditsUsed}`);

    if (!ctx.input.waitForCompletion) {
      return {
        output: { test },
        message: `Test **${test.testId}** has been queued for **${ctx.input.url}**. Credits used: ${test.creditsUsed ?? 'N/A'}, credits remaining: ${test.creditsLeft ?? 'N/A'}. Use the **Get Report** tool with the test ID to check status and retrieve results.`
      };
    }

    ctx.progress('Waiting for test to complete...');
    let completedTest = await client.pollTestUntilComplete(test.testId);

    if (completedTest.state === 'error') {
      return {
        output: { test: completedTest },
        message: `Test **${test.testId}** for **${ctx.input.url}** failed with error: ${completedTest.error ?? 'Unknown error'}`
      };
    }

    let report = completedTest.reportId
      ? await client.getReport(completedTest.reportId)
      : undefined;

    let grade = report?.gtmetrixGrade ?? 'N/A';
    let perfScore = report?.performanceScore ?? 'N/A';
    let structScore = report?.structureScore ?? 'N/A';
    let lcp =
      report?.largestContentfulPaint != null ? `${report.largestContentfulPaint}ms` : 'N/A';
    let tbt = report?.totalBlockingTime != null ? `${report.totalBlockingTime}ms` : 'N/A';
    let cls = report?.cumulativeLayoutShift ?? 'N/A';

    return {
      output: { test: completedTest, report },
      message: `Test completed for **${ctx.input.url}**:\n- **Grade:** ${grade}\n- **Performance Score:** ${perfScore}\n- **Structure Score:** ${structScore}\n- **LCP:** ${lcp}\n- **TBT:** ${tbt}\n- **CLS:** ${cls}`
    };
  })
  .build();
