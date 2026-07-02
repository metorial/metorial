import { z } from 'zod';

export let reportOutputSchema = z.object({
  reportId: z.string().describe('Unique identifier of the report'),
  url: z.string().describe('The tested URL'),
  pageId: z.string().describe('Associated page ID'),
  testId: z.string().describe('Test ID that generated this report'),
  source: z.string().describe('Source of the test (e.g. "api", "ondemand", "monitor")'),
  browser: z.string().describe('Browser ID used for the test'),
  location: z.string().describe('Location ID used for the test'),
  created: z.number().describe('Unix timestamp when the report was created'),
  expires: z.number().describe('Unix timestamp when the report expires'),

  gtmetrixGrade: z.string().optional().describe('Overall GTmetrix grade (A-F)'),
  gtmetrixScore: z.number().optional().describe('Overall GTmetrix numeric score (0-100)'),
  performanceScore: z.number().optional().describe('Lighthouse Performance score (0-100)'),
  structureScore: z.number().optional().describe('GTmetrix Structure score (0-100)'),
  pagespeedScore: z
    .number()
    .optional()
    .describe('PageSpeed score (0-100, legacy report only)'),
  yslowScore: z.number().optional().describe('YSlow score (0-100, legacy report only)'),

  htmlBytes: z.number().optional().describe('HTML document size in bytes'),
  pageBytes: z.number().optional().describe('Total page size in bytes'),
  pageRequests: z.number().optional().describe('Total number of HTTP requests'),

  redirectDuration: z.number().optional().describe('Time spent in redirects (ms)'),
  connectDuration: z.number().optional().describe('Time to establish connection (ms)'),
  backendDuration: z.number().optional().describe('Server processing time (ms)'),
  timeToFirstByte: z.number().optional().describe('Time to first byte (ms)'),
  firstPaintTime: z.number().optional().describe('First paint time (ms)'),
  firstContentfulPaint: z.number().optional().describe('First Contentful Paint (ms)'),
  domInteractiveTime: z.number().optional().describe('DOM Interactive time (ms)'),
  domContentLoadedTime: z.number().optional().describe('DOM Content Loaded event time (ms)'),
  domContentLoadedDuration: z
    .number()
    .optional()
    .describe('DOM Content Loaded event duration (ms)'),
  onloadTime: z.number().optional().describe('Onload event time (ms)'),
  onloadDuration: z.number().optional().describe('Onload event duration (ms)'),
  fullyLoadedTime: z.number().optional().describe('Fully loaded time (ms)'),

  rumSpeedIndex: z.number().optional().describe('RUM Speed Index (ms)'),
  speedIndex: z.number().optional().describe('Speed Index (ms)'),
  largestContentfulPaint: z.number().optional().describe('Largest Contentful Paint (ms)'),
  timeToInteractive: z.number().optional().describe('Time to Interactive (ms)'),
  totalBlockingTime: z.number().optional().describe('Total Blocking Time (ms)'),
  cumulativeLayoutShift: z.number().optional().describe('Cumulative Layout Shift score'),

  resourceLinks: z
    .record(z.string(), z.string())
    .describe('Links to report resources (HAR, screenshot, video, PDF, etc.)'),
  reportUrl: z.string().optional().describe('Public URL of the GTmetrix report')
});

export let testOutputSchema = z.object({
  testId: z.string().describe('Unique identifier of the test'),
  state: z.string().describe('Current test state: queued, started, completed, or error'),
  source: z.string().describe('Source of the test (e.g. "api")'),
  url: z.string().optional().describe('The tested URL'),
  location: z.string().describe('Location ID used for the test'),
  browser: z.string().describe('Browser ID used for the test'),
  reportId: z.string().optional().describe('Report ID (only present when test is completed)'),
  pageId: z.string().optional().describe('Associated page ID'),
  created: z.number().optional().describe('Unix timestamp when the test was created'),
  started: z.number().optional().describe('Unix timestamp when the test started running'),
  finished: z.number().optional().describe('Unix timestamp when the test finished'),
  creditsLeft: z.number().optional().describe('Remaining API credits after this test'),
  creditsUsed: z.number().optional().describe('Credits consumed by this test'),
  error: z.string().optional().describe('Error message if the test failed')
});

export let pageOutputSchema = z.object({
  pageId: z.string().describe('Unique identifier of the page'),
  url: z.string().describe('Page URL'),
  created: z.number().describe('Unix timestamp when the page was created'),
  browser: z.string().describe('Browser ID associated with this page'),
  location: z.string().describe('Location ID associated with this page'),
  latestReportTime: z.number().optional().describe('Unix timestamp of the most recent report'),
  latestReportId: z.string().optional().describe('Report ID of the most recent report'),
  reportCount: z.number().describe('Total number of reports for this page'),
  monitored: z
    .string()
    .describe('Monitoring status: "no", "hourly", "daily", "weekly", or "monthly"')
});
