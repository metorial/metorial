import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

// WHOIS returns oldest-first arrays of Unix seconds; retain the full source in raw.
let whoisDate = (value: unknown): string | undefined => {
  let first = Array.isArray(value) ? value[0] : value;
  if (typeof first === 'string') return first;
  if (typeof first !== 'number' || !Number.isFinite(first)) return undefined;
  let date = new Date(first * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

export let lookupDomain = SlateTool.create(spec, {
  name: 'Lookup Domain',
  key: 'lookup_domain',
  description: `Get WHOIS registration data and DNS records for a domain, including registrar, creation date, expiration, and nameservers. Non-.com domains and some record types require a premium plan.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      domain: z.string().describe('Domain name to look up (e.g. "example.com")'),
      includeDns: z.boolean().optional().describe('Also fetch DNS records (default: true)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Original provider responses'),
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
            value: z
              .string()
              .optional()
              .describe('Record value; omitted for structured SOA records'),
            raw: z
              .unknown()
              .optional()
              .describe('Original DNS record, including structured SOA fields')
          })
        )
        .optional()
        .describe('DNS records for the domain')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let [whoisResult, dnsResult] = await Promise.all([
      client.getWhois(ctx.input.domain),
      ctx.input.includeDns !== false
        ? client.getDnsLookup(ctx.input.domain)
        : Promise.resolve(undefined)
    ]);
    let expirationDate = whoisDate(whoisResult.expiration_date);
    return {
      output: {
        raw: { whois: whoisResult, ...(dnsResult !== undefined ? { dns: dnsResult } : {}) },
        whois: {
          domainName: whoisResult.domain_name ?? undefined,
          registrar: whoisResult.registrar ?? undefined,
          creationDate: whoisDate(whoisResult.creation_date),
          expirationDate,
          nameservers: whoisResult.name_servers ?? whoisResult.nameservers ?? undefined
        },
        dnsRecords: dnsResult?.map(
          (record: { record_type: string; value?: string | null }) => ({
            recordType: record.record_type,
            value: record.value ?? undefined,
            raw: record
          })
        )
      },
      message: `Domain information for **${ctx.input.domain}**.${whoisResult.registrar ? ` Registrar: ${whoisResult.registrar}.` : ''}${expirationDate ? ` Expires: ${expirationDate}.` : ''}`
    };
  })
  .build();
