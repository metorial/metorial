import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let onPageAudit = SlateTool.create(spec, {
  name: 'On-Page Audit',
  key: 'on_page_audit',
  description: `Start a website crawl for technical SEO auditing. Crawls the target website to identify technical issues, broken links, missing meta tags, and other on-page SEO problems. Returns a task ID that can be used to retrieve results once the crawl is complete. Supports JavaScript rendering and customizable page limits.`,
  instructions: [
    'Provide the target website domain to crawl. The crawl runs asynchronously - you will receive a task ID.',
    'Use the task ID with the "Get Task Result" tool to check status and retrieve audit results.',
    'JavaScript rendering can be enabled for dynamic/SPA websites.'
  ],
  constraints: [
    'Maximum crawl pages defaults to 10; increase as needed up to 100,000.',
    'Crawl may take time depending on website size.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      target: z.string().describe('Target website domain to crawl (e.g., "example.com")'),
      maxCrawlPages: z
        .number()
        .optional()
        .describe('Maximum number of pages to crawl (default 10, max 100000)'),
      startUrl: z
        .string()
        .optional()
        .describe('Starting URL for the crawl (defaults to homepage)'),
      enableJavascript: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering during crawl'),
      enableBrowserRendering: z
        .boolean()
        .optional()
        .describe(
          'Emulate browser rendering to measure Core Web Vitals. This enables JavaScript and resource loading.'
        ),
      calculateKeywordDensity: z
        .boolean()
        .optional()
        .describe('Calculate keyword density values for crawled pages'),
      storeRawHtml: z
        .boolean()
        .optional()
        .describe('Store raw HTML so it can be retrieved through OnPage raw HTML endpoints'),
      customJs: z
        .string()
        .optional()
        .describe('Custom JavaScript code to execute while crawling pages'),
      loadResources: z
        .boolean()
        .optional()
        .describe('Load external resources (CSS, JS, images)'),
      checkSpell: z.boolean().optional().describe('Enable spell checking'),
      disableCookiePopup: z
        .boolean()
        .optional()
        .describe('Attempt to disable cookie consent popups while crawling'),
      checksThreshold: z
        .record(z.string(), z.number())
        .optional()
        .describe('Custom threshold values for OnPage checks')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID for retrieving crawl results'),
      target: z.string().describe('Target that was submitted for crawling'),
      statusMessage: z.string().describe('Current status message'),
      cost: z.number().optional().describe('API cost')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.onPageTaskPost({
      target: ctx.input.target,
      maxCrawlPages: ctx.input.maxCrawlPages,
      startUrl: ctx.input.startUrl,
      enableJavascript: ctx.input.enableJavascript,
      enableBrowserRendering: ctx.input.enableBrowserRendering,
      calculateKeywordDensity: ctx.input.calculateKeywordDensity,
      storeRawHtml: ctx.input.storeRawHtml,
      customJs: ctx.input.customJs,
      loadResources: ctx.input.loadResources,
      checkSpell: ctx.input.checkSpell,
      disableCookiePopup: ctx.input.disableCookiePopup,
      checksThreshold: ctx.input.checksThreshold
    });

    let taskId = client.extractTaskId(response);
    let task = response.tasks?.[0];

    return {
      output: {
        taskId,
        target: ctx.input.target,
        statusMessage: task?.status_message ?? 'Task created',
        cost: response.cost
      },
      message: `On-page audit task created for **${ctx.input.target}**. Task ID: \`${taskId}\`. Use this ID to retrieve results once the crawl completes.`
    };
  })
  .build();
