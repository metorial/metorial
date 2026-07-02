import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let domainRecordSchema = z
  .object({
    hostname: z.string().optional().describe('Domain hostname'),
    alexaRank: z.number().optional().describe('Alexa traffic ranking'),
    hostProvider: z.array(z.string()).optional().describe('Hosting providers'),
    mailProvider: z.array(z.string()).optional().describe('Mail providers'),
    companyName: z.string().optional().describe('Computed company name'),
    whois: z
      .object({
        registrar: z.string().optional(),
        createdDate: z.number().optional(),
        expiresDate: z.number().optional()
      })
      .passthrough()
      .optional()
  })
  .passthrough();

export let searchDomains = SlateTool.create(spec, {
  name: 'Search Domains',
  key: 'search_domains',
  description: `Search and filter domains using a powerful DSL (SQL-like query language) or structured filters. Searchable fields include IPv4/IPv6 address, nameserver, WHOIS email/organization/name, SOA email, TLD, apex domain, keyword, and more.

Use the **query** parameter for DSL syntax like \`whois_email = 'admin@example.com'\`, or use **filter** for simple key-value matching. Optionally retrieve statistics instead of records by setting **statsOnly**.`,
  instructions: [
    'Use DSL query syntax: e.g., `ipv4 = "1.2.3.4"`, `whois_email = "admin@example.com"`, `tld = "com" AND ns = "ns1.example.com"`.',
    'Available DSL fields: ipv4, ipv6, asn, mx, ns, cname, subdomain, apex_domain, soa_email, tld, whois_email, whois_name, whois_organization, whois_street1-4, whois_city, whois_country, whois_postalCode, whois_telephone, whois_registrar, whois_created, whois_expires, keyword, first_seen, dropped.',
    'Operators: =, !=, >, <, >=, <=, IN, between ... and ..., AND, OR.',
    'Either provide "query" (DSL string) or "filter" (JSON object), not both.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          "DSL query string (e.g., \"whois_email = 'admin@example.com' AND tld = 'com'\")"
        ),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Simple filter object with field-value pairs (e.g., {"ipv4": "1.2.3.4", "tld": "com"})'
        ),
      includeIps: z
        .boolean()
        .optional()
        .describe('Resolve A records and include IP addresses in results'),
      page: z.number().optional().describe('Page number for pagination'),
      statsOnly: z
        .boolean()
        .optional()
        .describe(
          'Return statistics (TLD count, hostname count, domain count) instead of records'
        )
    })
  )
  .output(
    z
      .object({
        records: z.array(domainRecordSchema).optional().describe('Matching domain records'),
        recordCount: z.number().optional().describe('Total number of matching records'),
        meta: z
          .object({
            totalPages: z.number().optional(),
            query: z.string().optional(),
            page: z.number().optional(),
            maxPage: z.number().optional()
          })
          .passthrough()
          .optional()
          .describe('Pagination metadata'),
        stats: z.any().optional().describe('Search statistics when statsOnly is enabled')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.statsOnly) {
      let result = await client.searchDomainsStats(ctx.input.query, ctx.input.filter);
      return {
        output: {
          stats: result,
          ...result
        },
        message: `Retrieved domain search statistics.`
      };
    }

    let result: any;
    if (ctx.input.query) {
      result = await client.searchDomainsDsl(ctx.input.query, {
        includeIps: ctx.input.includeIps,
        page: ctx.input.page
      });
    } else if (ctx.input.filter) {
      result = await client.searchDomainsFilter(ctx.input.filter, {
        includeIps: ctx.input.includeIps,
        page: ctx.input.page
      });
    } else {
      throw new Error('Either "query" or "filter" must be provided.');
    }

    let records = result.records ?? [];

    return {
      output: {
        records,
        recordCount: result.record_count ?? records.length,
        meta: result.meta,
        ...result
      },
      message: `Found **${result.record_count ?? records.length}** domains matching the search criteria (page ${result.meta?.page ?? 1}).`
    };
  })
  .build();
