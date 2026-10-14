import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve captured data for a monitored page using its site, session, and page identifiers. Returns the full page response plus available URL, status, capture time, and change metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site containing the page'),
      sessionId: z.string().describe('ID of the session containing the page'),
      pageId: z.string().describe('ID of the page to retrieve')
    })
  )
  .output(
    z.object({
      siteId: z.string().describe('ID of the site'),
      sessionId: z.string().describe('ID of the session'),
      pageId: z.string().describe('ID of the page'),
      url: z.string().optional().describe('The monitored URL'),
      statusCode: z.number().optional().describe('HTTP status code of the last crawl'),
      capturedAt: z.string().optional().describe('Timestamp of the last capture'),
      changeDetected: z.boolean().optional().describe('Whether a change was detected'),
      rawData: z.any().optional().describe('Full raw page data from Fluxguard')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.getPage(ctx.input.siteId, ctx.input.sessionId, ctx.input.pageId);
    if (!result || typeof result !== 'object' || Array.isArray(result)) {
      throw createApiServiceError('Fluxguard returned invalid page data.');
    }

    return {
      output: {
        siteId: ctx.input.siteId,
        sessionId: ctx.input.sessionId,
        pageId: ctx.input.pageId,
        url: result.url ?? result.pageUrl ?? undefined,
        statusCode: result.statusCode ?? undefined,
        capturedAt: result.capturedAt ?? undefined,
        changeDetected: result.changeDetected ?? undefined,
        rawData: result
      },
      message: `Retrieved page data for \`${ctx.input.pageId}\`${result.url ? ` (${result.url})` : ''}.`
    };
  })
  .build();
