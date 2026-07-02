import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyDomain = SlateTool.create(spec, {
  name: 'Verify Domain',
  key: 'verify_domain',
  description: `Verify whether a domain has valid MX records and check its characteristics. Returns information about whether the domain accepts all emails (catch-all), is disposable, is a free email provider, and its DNS records.`,
  constraints: [
    'Rate limited to 1,000 requests per minute.',
    'Consumes one credit per domain verification.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('The domain to verify, e.g. usebouncer.com')
    })
  )
  .output(
    z.object({
      domain: z
        .object({
          name: z.string().describe('The verified domain name'),
          acceptAll: z
            .string()
            .describe('Whether the domain accepts all emails / catch-all (yes/no)'),
          disposable: z
            .string()
            .describe('Whether the domain is a disposable email provider (yes/no)'),
          free: z.string().describe('Whether the domain is a free email provider (yes/no)')
        })
        .describe('Domain characteristics'),
      dns: z
        .object({
          type: z.string().describe('DNS record type, e.g. MX'),
          record: z.string().describe('DNS record value')
        })
        .describe('DNS record information'),
      provider: z.string().describe('Email service provider for this domain'),
      toxic: z.string().describe('Toxicity indicator for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.verifyDomain(ctx.input.domain);

    return {
      output: result,
      message: `Domain **${result.domain.name}**: provider **${result.provider}**, accept-all: ${result.domain.acceptAll}, disposable: ${result.domain.disposable}, free: ${result.domain.free}`
    };
  })
  .build();
