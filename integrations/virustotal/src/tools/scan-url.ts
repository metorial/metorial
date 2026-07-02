import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scanUrl = SlateTool.create(spec, {
  name: 'Scan URL',
  key: 'scan_url',
  description: `Submit a URL for scanning by VirusTotal's 70+ URL scanners and blocklists. Returns an analysis ID that can be used to retrieve scan results once complete.`,
  constraints: ['Public API users are limited to 4 requests per minute.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z.string().describe('The URL to scan (e.g. "https://example.com")')
    })
  )
  .output(
    z.object({
      analysisId: z.string().describe('ID of the queued analysis'),
      analysisType: z.string().describe('Type of the analysis object'),
      selfLink: z.string().optional().describe('API link to retrieve the analysis status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.scanUrl(ctx.input.url);

    return {
      output: {
        analysisId: result?.id ?? '',
        analysisType: result?.type ?? 'analysis',
        selfLink: result?.links?.self
      },
      message: `URL scan submitted for \`${ctx.input.url}\`. Analysis ID: \`${result?.id}\`. Use the **Get Analysis Status** tool to check results.`
    };
  })
  .build();
