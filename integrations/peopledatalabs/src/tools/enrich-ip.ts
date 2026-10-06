import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const coordinate = (geo: unknown, index: number) => {
  if (typeof geo !== 'string') return null;
  const part = geo.split(',')[index];
  if (!part?.trim()) return null;
  const value = Number(part);
  return Number.isFinite(value) && Math.abs(value) <= (index === 0 ? 90 : 180) ? value : null;
};

export let enrichIp = SlateTool.create(spec, {
  name: 'Enrich IP Address',
  key: 'enrich_ip',
  description: `Enrich data on an IP address by matching against nearly 2 billion IPs. Returns associated location, company, and metadata information. Supports both IPv4 and IPv6 formats.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IP address to enrich (IPv4 or IPv6)'),
      returnIfUnmatched: z
        .boolean()
        .optional()
        .describe('Return partial data even if no full match is found')
    })
  )
  .output(
    z.object({
      ip: z.string().nullable().optional().describe('The queried IP address'),
      company: z
        .object({
          name: z.string().nullable().optional(),
          displayName: z.string().nullable().optional(),
          size: z.string().nullable().optional(),
          industry: z.string().nullable().optional(),
          websiteUrl: z.string().nullable().optional(),
          linkedinUrl: z.string().nullable().optional(),
          locationName: z.string().nullable().optional(),
          founded: z.number().nullable().optional(),
          employeeCount: z.number().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Company associated with the IP address'),
      location: z
        .object({
          name: z.string().nullable().optional(),
          locality: z.string().nullable().optional(),
          region: z.string().nullable().optional(),
          country: z.string().nullable().optional(),
          continent: z.string().nullable().optional(),
          postalCode: z.string().nullable().optional(),
          latitude: z.number().nullable().optional(),
          longitude: z.number().nullable().optional(),
          metro: z.string().nullable().optional()
        })
        .nullable()
        .optional()
        .describe('Geographic location associated with the IP address'),
      confidence: z
        .string()
        .nullable()
        .optional()
        .describe('Confidence level of the match (very high, high, moderate, low)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      sandbox: ctx.config.sandbox
    });

    let params: Record<string, unknown> = { return_ip_location: true };
    if (ctx.input.returnIfUnmatched !== undefined)
      params.return_if_unmatched = ctx.input.returnIfUnmatched;

    let result = await client.enrichIp(ctx.input.ip, params);
    let data = result.data || result;

    let company = data.company
      ? {
          name: data.company.name ?? null,
          displayName: data.company.display_name ?? null,
          size: data.company.size ?? null,
          industry: data.company.industry ?? null,
          websiteUrl: data.company.website ?? null,
          linkedinUrl: data.company.linkedin_url ?? null,
          locationName: data.company.location?.name ?? null,
          founded: data.company.founded ?? null,
          employeeCount: data.company.employee_count ?? null
        }
      : null;

    let ipData = typeof data.ip === 'object' && data.ip ? data.ip : {};
    let ipLocation = ipData.location ?? data.location;
    let location = ipLocation
      ? {
          name: ipLocation.name ?? null,
          locality: ipLocation.locality ?? null,
          region: ipLocation.region ?? null,
          country: ipLocation.country ?? null,
          continent: ipLocation.continent ?? null,
          postalCode: ipLocation.postal_code ?? null,
          latitude: ipLocation.geo ? coordinate(ipLocation.geo, 0) : null,
          longitude: ipLocation.geo ? coordinate(ipLocation.geo, 1) : null,
          metro: ipLocation.metro ?? null
        }
      : null;

    return {
      output: {
        ip: ipData.address ?? (typeof data.ip === 'string' ? data.ip : ctx.input.ip),
        company,
        location,
        confidence: data.company?.confidence ?? data.confidence ?? null
      },
      message: company?.name
        ? `IP **${ctx.input.ip}** is associated with **${company.displayName || company.name}**${location?.name ? ` in ${location.name}` : ''}${data.company?.confidence ? ` (${data.company.confidence} confidence)` : ''}`
        : `IP **${ctx.input.ip}** enrichment completed.${location?.name ? ` Location: ${location.name}` : ' No company association found.'}`
    };
  })
  .build();
