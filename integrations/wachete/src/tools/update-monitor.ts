import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let urlFilterValueSchema = z.object({
  filter: z.string().describe('Filter string or regex pattern'),
  type: z.enum(['Contains', 'Regex']).describe('Filter matching type')
});

export let updateMonitor = SlateTool.create(spec, {
  name: 'Update Monitor',
  key: 'update_monitor',
  description: `Updates an existing web page monitor (wachet).
Only the fields you provide will be changed; all other settings remain unchanged.
Can modify the URL, XPath, alerts, notification endpoints, check frequency, and other settings.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      wachetId: z.string().describe('ID of the monitor to update'),
      name: z.string().optional().describe('New name for the monitor'),
      url: z.string().optional().describe('New URL to monitor'),
      xPath: z.string().optional().describe('New XPath selector'),
      excludeXPath: z.string().optional().describe('XPath selector for content to exclude'),
      regex: z
        .string()
        .optional()
        .describe('Regex to extract specific content from the matched XPath'),
      jobType: z.enum(['SinglePage', 'Portal']).optional().describe('Monitor type'),
      recurrenceInSeconds: z.number().optional().describe('Check frequency in seconds'),
      alerts: z
        .array(
          z.object({
            type: z.enum(['Error', 'NotEq']).describe('Alert condition type')
          })
        )
        .optional()
        .describe('Alert conditions'),
      notificationEndpoints: z
        .array(
          z.object({
            type: z.enum(['Webhook', 'Email']).describe('Notification channel type'),
            value: z.string().describe('Webhook URL or email address')
          })
        )
        .optional()
        .describe('Notification channels'),
      dynamicContent: z.boolean().optional().describe('Enable JavaScript rendering'),
      proxies: z
        .array(
          z.object({
            location: z.enum(['us', 'gb']).describe('Proxy location')
          })
        )
        .optional()
        .describe('Geographic proxy locations'),
      folderId: z.string().optional().describe('Folder ID to move the monitor to'),
      method: z.string().optional().describe('HTTP method for the request'),
      headers: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Custom HTTP headers'),
      body: z.string().optional().describe('HTTP request body'),
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
      wachetId: z.string().describe('ID of the updated monitor'),
      name: z.string().optional().describe('Updated name'),
      url: z.string().optional().describe('Updated URL'),
      jobType: z.string().optional().describe('Monitor type'),
      recurrenceInSeconds: z.number().optional().describe('Check frequency in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    // Fetch current monitor to merge with updates
    let existing = await client.getWachet(ctx.input.wachetId);

    let updated = {
      ...existing,
      id: ctx.input.wachetId,
      ...(ctx.input.name !== undefined && { name: ctx.input.name }),
      ...(ctx.input.url !== undefined && { url: ctx.input.url }),
      ...(ctx.input.xPath !== undefined && { xPath: ctx.input.xPath }),
      ...(ctx.input.excludeXPath !== undefined && { excludeXPath: ctx.input.excludeXPath }),
      ...(ctx.input.regex !== undefined && { regex: ctx.input.regex }),
      ...(ctx.input.jobType !== undefined && { jobType: ctx.input.jobType }),
      ...(ctx.input.recurrenceInSeconds !== undefined && {
        recurrenceInSeconds: ctx.input.recurrenceInSeconds
      }),
      ...(ctx.input.alerts !== undefined && { alerts: ctx.input.alerts }),
      ...(ctx.input.notificationEndpoints !== undefined && {
        notificationEndpoints: ctx.input.notificationEndpoints
      }),
      ...(ctx.input.dynamicContent !== undefined && {
        dynamicContent: ctx.input.dynamicContent
      }),
      ...(ctx.input.proxies !== undefined && { proxies: ctx.input.proxies }),
      ...(ctx.input.folderId !== undefined && { folderId: ctx.input.folderId }),
      ...(ctx.input.method !== undefined && { method: ctx.input.method }),
      ...(ctx.input.headers !== undefined && { headers: ctx.input.headers }),
      ...(ctx.input.body !== undefined && { body: ctx.input.body }),
      ...(ctx.input.crawlingDepth !== undefined && { crawlingDepth: ctx.input.crawlingDepth }),
      ...(ctx.input.urlFilter !== undefined && { urlFilter: ctx.input.urlFilter }),
      ...(ctx.input.crawlPagesFromAllDomains !== undefined && {
        crawlPagesFromAllDomains: ctx.input.crawlPagesFromAllDomains
      }),
      ...(ctx.input.note !== undefined && { note: ctx.input.note })
    };

    let result = await client.createOrUpdateWachet(updated);

    return {
      output: {
        wachetId: result.id ?? ctx.input.wachetId,
        name: result.name,
        url: result.url,
        jobType: result.jobType,
        recurrenceInSeconds: result.recurrenceInSeconds
      },
      message: `Updated monitor **${result.name}** (ID: \`${result.id}\`).`
    };
  })
  .build();
