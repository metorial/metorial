import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShortPixelClient } from '../lib/client';
import { spec } from '../spec';

export let manageDomain = SlateTool.create(spec, {
  name: 'Manage Domain',
  key: 'manage_domain',
  description: `Manage domains associated with your ShortPixel API key for CDN usage. Supports associating a domain, revoking a domain, checking domain status, reading CDN usage statistics, purging storage, and purging CDN cache.
Use this to set up domains for ShortPixel Adaptive Images or to manage existing domain associations.`,
  instructions: [
    'Use "associate" to link a domain to your API key before using ShortPixel CDN.',
    'Use "status" to check if a domain is properly associated and has available credits.',
    'Use "cdn_usage" to view optimization statistics for a domain.',
    'It may take up to 5 minutes after associating a domain for the CDN to start serving images.',
    'If your domain is example.com and you use cdn.example.com, associate both domains.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'associate',
          'revoke',
          'status',
          'cdn_usage',
          'purge_storage',
          'purge_cdn_cache'
        ])
        .describe('Action to perform on the domain'),
      domain: z.string().describe('The domain name to manage (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      action: z.string().describe('The action that was performed'),
      domain: z.string().describe('The domain that was managed'),
      statusCode: z
        .number()
        .optional()
        .describe(
          'Domain status code: 2=OK, 1=credits almost exhausted, -1=credits exhausted, -2=credits used up, -3=domain not reachable'
        ),
      statusMessage: z
        .string()
        .optional()
        .describe('Human-readable interpretation of the status'),
      monthlyApiCalls: z
        .number()
        .optional()
        .describe('Paid API calls from monthly quota for this domain'),
      oneTimeApiCalls: z
        .number()
        .optional()
        .describe('Paid API calls from one-time quota for this domain'),
      rawResponse: z.any().optional().describe('Raw response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShortPixelClient({ token: ctx.auth.token });
    let { action, domain } = ctx.input;

    let statusCodeToMessage = (code: number): string => {
      switch (code) {
        case 2:
          return 'All OK';
        case 1:
          return 'Credits almost exhausted';
        case -1:
          return 'Credits exhausted';
        case -2:
          return 'Credits used up some time ago';
        case -3:
          return 'Domain not reachable';
        default:
          return `Unknown status (${code})`;
      }
    };

    if (action === 'associate') {
      let result = await client.setDomain(domain);
      return {
        output: { action, domain, rawResponse: result },
        message: `Domain **${domain}** has been associated with your API key. It may take up to 5 minutes for the CDN to start serving images.`
      };
    }

    if (action === 'revoke') {
      let result = await client.revokeDomain(domain);
      return {
        output: { action, domain, rawResponse: result },
        message: `Domain **${domain}** association has been revoked.`
      };
    }

    if (action === 'status') {
      let result = await client.readDomainStatus(domain);
      let code = result.Status ?? 0;
      let message = statusCodeToMessage(code);
      return {
        output: {
          action,
          domain,
          statusCode: code,
          statusMessage: message,
          rawResponse: result
        },
        message: `Domain **${domain}** status: **${message}** (code: ${code})`
      };
    }

    if (action === 'cdn_usage') {
      let result = await client.readDomainCdnUsage(domain);
      return {
        output: {
          action,
          domain,
          monthlyApiCalls: result.PaidAPICalls ?? 0,
          oneTimeApiCalls: result.PaidAPICallsOneTime ?? 0,
          rawResponse: result
        },
        message: `Domain **${domain}** CDN usage: **${result.PaidAPICalls ?? 0}** monthly calls, **${result.PaidAPICallsOneTime ?? 0}** one-time calls.`
      };
    }

    if (action === 'purge_storage') {
      let result = await client.purgeStorageBulk(domain);
      return {
        output: { action, domain, rawResponse: result },
        message: `Storage purged for domain **${domain}**.`
      };
    }

    if (action === 'purge_cdn_cache') {
      let result = await client.purgeCdnCacheBulk(domain);
      return {
        output: { action, domain, rawResponse: result },
        message: `CDN cache purged for domain **${domain}**.`
      };
    }

    return {
      output: { action, domain },
      message: `Unknown action: ${action}`
    };
  })
  .build();
