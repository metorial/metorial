import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { blacklistInputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let exportBlacklist = SlateTool.create(spec, {
  name: 'Export Blacklist',
  key: 'export_blacklist',
  description:
    'Prepare a downloadable plaintext blacklist with one IP address per line for firewall import. Supports the same confidence, country, and IP version filters as get_blacklist.',
  instructions: [
    'Custom confidence thresholds and country filtering require a subscription.',
    'AbuseIPDB caps the number of IPs to your plan limit. Downloading the file consumes a blacklist request from your daily quota.',
    'Keep imported blocklists updated so IPs whose reputation improves can be removed.'
  ],
  tags: { readOnly: true }
})
  .input(blacklistInputSchema)
  .output(z.object({ mimeType: z.string().describe('Download MIME type') }))
  .handleInvocation(async ctx => {
    if (!ctx.auth.token) {
      throw createApiServiceError('An AbuseIPDB API key is required. Reconnect your account.');
    }

    let query: Record<string, string> = {
      confidenceMinimum: String(ctx.input.confidenceMinimum ?? 100)
    };
    for (let key of ['limit', 'onlyCountries', 'exceptCountries', 'ipVersion'] as const) {
      let value = ctx.input[key];
      if (value !== undefined) query[key] = String(value);
    }

    await ctx.addAttachment({
      type: 'url',
      url: 'https://api.abuseipdb.com/api/v2/blacklist',
      headers: { Key: ctx.auth.token, Accept: 'text/plain' },
      query,
      mimeType: 'text/plain'
    });

    return {
      output: { mimeType: 'text/plain' },
      message: 'Prepared the plaintext IP blacklist for download.'
    };
  })
  .build();
