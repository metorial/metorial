import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupDomain = SlateTool.create(spec, {
  name: 'Lookup Domain',
  key: 'lookup_domain',
  description: `Get WHOIS registration data and DNS records for a domain. Combines WHOIS and DNS lookup into a single tool to provide comprehensive domain information including registrar, creation date, expiration, nameservers, and DNS records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to look up (e.g. "example.com")'),
      includeDns: z.boolean().optional().describe('Also fetch DNS records (default: true)')
    })
  )
  .output(
    z.object({
      whois: z
        .object({
          domainName: z.string().optional().describe('Registered domain name'),
          registrar: z.string().optional().describe('Domain registrar'),
          creationDate: z.string().optional().describe('Domain creation date'),
          expirationDate: z.string().optional().describe('Domain expiration date'),
          nameservers: z.array(z.string()).optional().describe('Nameserver list')
        })
        .optional()
        .describe('WHOIS registration data'),
      dnsRecords: z
        .array(
          z.object({
            recordType: z.string().describe('DNS record type (A, AAAA, MX, CNAME, etc.)'),
            value: z.string().describe('Record value')
          })
        )
        .optional()
        .describe('DNS records for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let includeDns = ctx.input.includeDns !== false;

    let [whoisResult, dnsResult] = await Promise.all([
      client.getWhois(ctx.input.domain),
      includeDns ? client.getDnsLookup(ctx.input.domain) : Promise.resolve(null)
    ]);

    let dnsRecords = dnsResult
      ? (Array.isArray(dnsResult) ? dnsResult : [dnsResult]).map((r: any) => ({
          recordType: r.record_type ?? r.type ?? 'Unknown',
          value: r.value ?? r.address ?? String(r)
        }))
      : undefined;

    return {
      output: {
        whois: {
          domainName: whoisResult.domain_name,
          registrar: whoisResult.registrar,
          creationDate: whoisResult.creation_date,
          expirationDate: whoisResult.expiration_date,
          nameservers: whoisResult.name_servers ?? whoisResult.nameservers
        },
        dnsRecords
      },
      message: `**${ctx.input.domain}** — Registrar: ${whoisResult.registrar ?? 'Unknown'}${whoisResult.expiration_date ? `, Expires: ${whoisResult.expiration_date}` : ''}`
    };
  })
  .build();
