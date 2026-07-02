import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let urlFilterValueSchema = z.object({
  filter: z.string().describe('Filter string or regex pattern'),
  type: z.enum(['Contains', 'Regex']).describe('Filter matching type')
});

export let createMonitor = SlateTool.create(spec, {
  name: 'Create Monitor',
  key: 'create_monitor',
  description: `Creates a new web page monitor (wachet) to track content changes on a URL.
Supports monitoring a **single page** or an **entire portal** with automatic crawling of subpages.
Configure XPath selectors, check frequency, alert conditions, notification channels, and more.`,
  instructions: [
    'Set jobType to "Portal" and configure crawlingDepth and urlFilter for crawling multiple subpages.',
    'Use dynamicContent: true if the target page renders content via JavaScript.',
    'Recurrence is specified in seconds (e.g., 86400 = once per day).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the monitor'),
      url: z.string().describe('URL of the page to monitor'),
      xPath: z.string().default('/').describe('XPath selector for the content to watch'),
      excludeXPath: z.string().optional().describe('XPath selector for content to exclude'),
      regex: z
        .string()
        .optional()
        .describe('Regex to extract specific content from the matched XPath'),
      jobType: z
        .enum(['SinglePage', 'Portal'])
        .default('SinglePage')
        .describe('Monitor type: SinglePage for a single URL, Portal for crawling subpages'),
      recurrenceInSeconds: z
        .number()
        .optional()
        .describe('How often to check the page, in seconds (e.g., 86400 for daily)'),
      alerts: z
        .array(
          z.object({
            type: z
              .enum(['Error', 'NotEq'])
              .describe(
                'Alert condition type: Error for page errors, NotEq for content changes'
              )
          })
        )
        .optional()
        .describe('Alert conditions that trigger notifications'),
      notificationEndpoints: z
        .array(
          z.object({
            type: z.enum(['Webhook', 'Email']).describe('Notification channel type'),
            value: z.string().describe('Webhook URL or email address')
          })
        )
        .optional()
        .describe('Where to send alert notifications'),
      dynamicContent: z
        .boolean()
        .optional()
        .describe('Enable JavaScript rendering for pages with dynamically loaded content'),
      proxies: z
        .array(
          z.object({
            location: z.enum(['us', 'gb']).describe('Proxy location')
          })
        )
        .optional()
        .describe('Monitor from specific geographic locations'),
      folderId: z.string().optional().describe('Folder ID to organize the monitor into'),
      method: z.string().optional().describe('HTTP method for the request (e.g., GET, POST)'),
      headers: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom HTTP headers for the request'),
      body: z.string().optional().describe('HTTP request body (for POST requests)'),
      crawlingDepth: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe('Crawling depth for Portal type (1-3)'),
      urlFilter: z
        .object({
          include: z
            .array(urlFilterValueSchema)
            .optional()
            .describe('URL patterns to include'),
          exclude: z.array(urlFilterValueSchema).optional().describe('URL patterns to exclude')
        })
        .optional()
        .describe('URL filters for Portal crawling'),
      crawlPagesFromAllDomains: z
        .boolean()
        .optional()
        .describe('Whether to crawl pages from all domains'),
      note: z.string().optional().describe('Optional note for the monitor')
    })
  )
  .output(
    z.object({
      wachetId: z.string().describe('ID of the created monitor'),
      name: z.string().optional().describe('Name of the monitor'),
      url: z.string().optional().describe('Monitored URL'),
      jobType: z.string().optional().describe('Monitor type'),
      recurrenceInSeconds: z.number().optional().describe('Check frequency in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createOrUpdateWachet({
      name: ctx.input.name,
      url: ctx.input.url,
      xPath: ctx.input.xPath,
      excludeXPath: ctx.input.excludeXPath,
      regex: ctx.input.regex,
      jobType: ctx.input.jobType,
      recurrenceInSeconds: ctx.input.recurrenceInSeconds,
      alerts: ctx.input.alerts,
      notificationEndpoints: ctx.input.notificationEndpoints,
      dynamicContent: ctx.input.dynamicContent,
      proxies: ctx.input.proxies,
      folderId: ctx.input.folderId,
      method: ctx.input.method,
      headers: ctx.input.headers,
      body: ctx.input.body,
      crawlingDepth: ctx.input.crawlingDepth,
      urlFilter: ctx.input.urlFilter,
      crawlPagesFromAllDomains: ctx.input.crawlPagesFromAllDomains,
      note: ctx.input.note
    });

    return {
      output: {
        wachetId: result.id ?? '',
        name: result.name,
        url: result.url,
        jobType: result.jobType,
        recurrenceInSeconds: result.recurrenceInSeconds
      },
      message: `Created monitor **${result.name}** for URL \`${result.url}\` (ID: \`${result.id}\`).`
    };
  })
  .build();
