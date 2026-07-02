import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let lookupDnsWhois = SlateTool.create(spec, {
  name: 'Lookup DNS & WHOIS',
  key: 'lookup_dns_whois',
  description: `Retrieve DNS records and/or WHOIS registration information for a domain, IP address, or URL.
DNS results include A, AAAA, MX, TXT, and other record types. WHOIS results include registrant information, creation/expiration dates, and registrar details.`,
  instructions: [
    'Provide a domain name, IP address, or URL.',
    'By default both DNS and WHOIS are returned. Set includeDns or includeWhois to false to skip one.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Domain name, IP address, or URL to look up'),
      includeDns: z.boolean().optional().describe('Include DNS records (default: true)'),
      includeWhois: z
        .boolean()
        .optional()
        .describe('Include WHOIS registration data (default: true)')
    })
  )
  .output(
    z.object({
      query: z.string().describe('The queried domain/IP/URL'),
      dns: z
        .object({
          records: z
            .array(
              z.object({
                type: z
                  .string()
                  .optional()
                  .describe('DNS record type (A, AAAA, MX, CNAME, etc.)'),
                value: z.string().optional().describe('Record value')
              })
            )
            .optional()
            .describe('DNS records found'),
          passiveDns: z
            .array(
              z.object({
                value: z.string().optional().describe('IP or domain value'),
                type: z.string().optional().describe('Record type'),
                firstSeen: z.string().optional().describe('First seen date'),
                lastSeen: z.string().optional().describe('Last seen date')
              })
            )
            .optional()
            .describe('Passive DNS records')
        })
        .optional()
        .describe('DNS lookup results'),
      whois: z
        .object({
          registrarName: z.string().optional().describe('Registrar name'),
          createdDate: z.string().optional().describe('Domain creation date'),
          updatedDate: z.string().optional().describe('Domain last updated date'),
          expiresDate: z.string().optional().describe('Domain expiration date'),
          registrant: z
            .record(z.string(), z.any())
            .optional()
            .describe('Registrant contact information'),
          nameServers: z.array(z.string()).optional().describe('Name servers'),
          status: z.array(z.string()).optional().describe('Domain status codes')
        })
        .optional()
        .describe('WHOIS registration results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient({
      token: ctx.auth.token,
      password: ctx.auth.password
    });

    let includeDns = ctx.input.includeDns !== false;
    let includeWhois = ctx.input.includeWhois !== false;

    let result: any = { query: ctx.input.query };
    let parts: string[] = [];

    if (includeDns) {
      ctx.progress('Resolving DNS records...');
      try {
        let dnsData = await client.getDnsRecords(ctx.input.query);

        let records: any[] = [];
        if (dnsData.A) {
          for (let r of dnsData.A) {
            records.push({ type: 'A', value: typeof r === 'string' ? r : r.record });
          }
        }
        if (dnsData.AAAA) {
          for (let r of dnsData.AAAA) {
            records.push({ type: 'AAAA', value: typeof r === 'string' ? r : r.record });
          }
        }
        if (dnsData.MX) {
          for (let r of dnsData.MX) {
            records.push({ type: 'MX', value: typeof r === 'string' ? r : r.exchange });
          }
        }
        if (dnsData.TXT) {
          for (let r of dnsData.TXT) {
            records.push({
              type: 'TXT',
              value: typeof r === 'string' ? r : Array.isArray(r) ? r.join('') : r.record
            });
          }
        }

        let passive = dnsData.Passive?.records?.map((p: any) => ({
          value: p.value,
          type: p.recordType,
          firstSeen: p.first,
          lastSeen: p.last
        }));

        result.dns = { records, passiveDns: passive };
        parts.push(`${records.length} DNS record(s)`);
      } catch (e: any) {
        ctx.warn(`DNS lookup failed: ${e.message}`);
        result.dns = { records: [] };
      }
    }

    if (includeWhois) {
      ctx.progress('Fetching WHOIS data...');
      try {
        let whoisData = await client.getWhois(ctx.input.query);
        let contact = whoisData.contact || [];
        let registrant = contact.find((c: any) => c.type === 'registrant');

        result.whois = {
          registrarName: whoisData.registrarName,
          createdDate: whoisData.createdDate,
          updatedDate: whoisData.updatedDate,
          expiresDate: whoisData.expiresDate,
          registrant: registrant
            ? {
                name: registrant.name,
                organization: registrant.organization,
                country: registrant.country
              }
            : undefined,
          nameServers: whoisData.nameServers,
          status: whoisData.status
        };
        parts.push('WHOIS data');
      } catch (e: any) {
        ctx.warn(`WHOIS lookup failed: ${e.message}`);
      }
    }

    return {
      output: result,
      message: `Lookup for **${ctx.input.query}**: ${parts.join(', ') || 'no data'}`
    };
  })
  .build();
