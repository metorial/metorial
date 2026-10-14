import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMonitor = SlateTool.create(spec, {
  name: 'Get Monitor',
  key: 'get_monitor',
  description: `Retrieves the full configuration and current status of a web page monitor (wachet) by its ID.
Returns all settings including URL, XPath, alerts, notification endpoints, check frequency, and latest data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      wachetId: z.string().describe('ID of the monitor to retrieve')
    })
  )
  .output(
    z.object({
      wachetId: z.string().describe('Monitor ID'),
      name: z.string().optional().describe('Monitor name'),
      url: z.string().optional().describe('Monitored URL'),
      xPath: z.string().optional().describe('XPath selector'),
      excludeXPath: z.string().optional().describe('Excluded XPath selector'),
      regex: z.string().optional().describe('Content extraction regex'),
      jobType: z.string().optional().describe('Monitor type (SinglePage or Portal)'),
      recurrenceInSeconds: z.number().optional().describe('Check frequency in seconds'),
      dynamicContent: z
        .boolean()
        .optional()
        .describe('Whether JavaScript rendering is enabled'),
      folderId: z.string().optional().describe('Folder the monitor belongs to'),
      alerts: z
        .array(
          z.object({
            type: z.string().describe('Alert type')
          })
        )
        .optional()
        .describe('Configured alert conditions'),
      notificationEndpoints: z
        .array(
          z.object({
            type: z.string().describe('Notification type'),
            value: z.string().optional().describe('Notification target')
          })
        )
        .optional()
        .describe('Configured notification channels'),
      proxies: z
        .array(
          z.object({
            location: z.string().describe('Proxy location')
          })
        )
        .optional()
        .describe('Configured proxy locations'),
      crawlingDepth: z.number().optional().describe('Crawling depth for Portal monitors'),
      lastCheckTimestamp: z
        .string()
        .optional()
        .describe('When the monitor last checked the page'),
      lastValue: z.string().optional().describe('Last captured content value'),
      lastError: z.string().optional().describe('Last error if any'),
      note: z.string().optional().describe('Monitor note')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let wachet = await client.getWachet(ctx.input.wachetId);

    return {
      output: {
        wachetId: wachet.id ?? ctx.input.wachetId,
        name: wachet.name ?? undefined,
        url: wachet.url ?? undefined,
        xPath: wachet.xPath ?? undefined,
        excludeXPath: wachet.excludeXPath ?? undefined,
        regex: wachet.regex ?? undefined,
        jobType: wachet.jobType == null ? undefined : String(wachet.jobType),
        recurrenceInSeconds: wachet.recurrenceInSeconds ?? undefined,
        dynamicContent: wachet.dynamicContent,
        folderId: wachet.folderId ?? undefined,
        alerts: wachet.alerts?.map(a => ({ type: String(a.type) })),
        notificationEndpoints: wachet.notificationEndpoints?.map(e => ({
          type: String(e.type),
          value: e.value ?? undefined
        })),
        proxies: wachet.proxies?.map(p => {
          if (!p.location) {
            throw createApiServiceError('Wachete returned a proxy without its location.');
          }
          return { location: p.location };
        }),
        crawlingDepth: wachet.crawlingDepth ?? undefined,
        lastCheckTimestamp: wachet.data?.lastCheckTimestamp ?? undefined,
        lastValue: wachet.data?.raw ?? undefined,
        lastError: wachet.data?.error ?? undefined,
        note: wachet.note ?? undefined
      },
      message: `Monitor **${wachet.name}** monitors \`${wachet.url}\` (type: ${wachet.jobType}).`
    };
  })
  .build();
