import { SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let domainWhois = SlateTool.create(spec, {
  name: 'Domain WHOIS Lookup',
  key: 'domain_whois',
  description: `Look up WHOIS registration information for a domain name. Returns registrar details, nameservers, registration dates, expiration dates, registrant information, and administrative/technical contacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to look up (e.g., "example.com")')
    })
  )
  .output(
    z.object({
      domainName: z.string().optional(),
      status: z.array(z.string()).optional(),
      nameservers: z.array(z.string()).optional(),
      dates: z.any().optional().describe('Registration and update dates'),
      expiration: z.any().optional().describe('Expiration date information'),
      registrar: z.any().optional().describe('Registrar details'),
      registrant: z.any().optional().describe('Registrant contact information'),
      administrative: z.any().optional().describe('Administrative contact'),
      technical: z.any().optional().describe('Technical contact'),
      raw: z.any().describe('Full raw WHOIS response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let result = await client.domainWhois({ domain: ctx.input.domain });

    let search = result.search ?? result;
    let domainData = search.domain ?? {};

    return {
      output: {
        domainName: domainData.name,
        status: domainData.status,
        nameservers: domainData.nameservers,
        dates: domainData.dates,
        expiration: domainData.expiration,
        registrar: search.registrar,
        registrant: search.registrant,
        administrative: search.administrative,
        technical: search.technical,
        raw: result
      },
      message: `WHOIS lookup for **${ctx.input.domain}**: registered with **${search.registrar?.name ?? 'unknown registrar'}**.`
    };
  })
  .build();

export let checkDomainReputation = SlateTool.create(spec, {
  name: 'Check Domain Reputation',
  key: 'check_domain_reputation',
  description: `Check if a domain or IP address is malicious or blacklisted. Combines malicious check and DNSBL (DNS-based Blackhole List) lookup to provide a comprehensive reputation assessment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainOrIp: z.string().describe('Domain name or IP address to check'),
      checkType: z
        .enum(['malicious', 'dnsbl', 'both'])
        .default('both')
        .describe('Type of reputation check to perform')
    })
  )
  .output(
    z.object({
      malicious: z
        .boolean()
        .optional()
        .describe('Whether the domain/IP is flagged as malicious'),
      maliciousSources: z
        .array(z.any())
        .optional()
        .describe('Sources that flagged the domain as malicious'),
      blacklisted: z.boolean().optional().describe('Whether the domain/IP is on a DNSBL'),
      blacklistDetectedCount: z
        .number()
        .optional()
        .describe('Number of blacklists detecting the domain'),
      blacklistProviders: z
        .array(z.string())
        .optional()
        .describe('Blacklist providers that detected the domain'),
      raw: z.any().describe('Full raw response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let maliciousResult: any;
    let dnsblResult: any;

    if (ctx.input.checkType === 'malicious' || ctx.input.checkType === 'both') {
      maliciousResult = await client.domainMalicious({ query: ctx.input.domainOrIp });
    }

    if (ctx.input.checkType === 'dnsbl' || ctx.input.checkType === 'both') {
      dnsblResult = await client.domainDnsbl({ query: ctx.input.domainOrIp });
    }

    return {
      output: {
        malicious: maliciousResult?.malicious,
        maliciousSources: maliciousResult?.sources,
        blacklisted: dnsblResult?.blacklisted,
        blacklistDetectedCount: dnsblResult?.detected?.count,
        blacklistProviders: dnsblResult?.detected?.providers,
        raw: { malicious: maliciousResult, dnsbl: dnsblResult }
      },
      message: `Domain reputation check for **${ctx.input.domainOrIp}**: malicious=${maliciousResult?.malicious ?? 'N/A'}, blacklisted=${dnsblResult?.blacklisted ?? 'N/A'}.`
    };
  })
  .build();
