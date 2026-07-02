import { SlateTool } from 'slates';
import { z } from 'zod';
import { IpEnrichClient } from '../lib/ip-enrich-client';
import { spec } from '../spec';

export let enrichIp = SlateTool.create(spec, {
  name: 'Enrich IP Address',
  key: 'enrich_ip',
  description: `Resolve an IPv4 or IPv6 address to company information using the IP-Enrich API. Returns company name, domain, industry, employee range, revenue, social profiles, business IDs, location, and a confidence score. Requires the IP-Enrich API key to be configured in authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to look up (e.g., 185.70.216.139)')
    })
  )
  .output(
    z.object({
      enrichmentId: z.string(),
      ipAddress: z.string(),
      confidenceScore: z
        .string()
        .describe('Confidence level: very high, high, medium, or low'),
      companyName: z.string(),
      companyDomain: z.string(),
      logoUrl: z.string(),
      revenueYear: z.number().nullable(),
      revenueAmount: z.number().nullable().describe('Revenue amount in USD'),
      employeesMin: z.number().nullable(),
      employeesMax: z.number().nullable(),
      industryName: z.string(),
      sicCodes: z.array(z.string()),
      naicsCodes: z.array(z.string()),
      twitterUrl: z.string(),
      facebookUrl: z.string(),
      linkedinUrl: z.string(),
      businessIds: z.array(
        z.object({
          countryCode: z.string(),
          key: z.string(),
          value: z.string()
        })
      ),
      city: z.string(),
      region: z.string(),
      countryCode: z.string()
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.ipEnrichToken) {
      throw new Error(
        'IP-Enrich API key is not configured. Please add it in authentication settings.'
      );
    }

    let client = new IpEnrichClient(ctx.auth.ipEnrichToken);
    let result = await client.enrichIp(ctx.input.ipAddress);

    return {
      output: result,
      message: `IP **${ctx.input.ipAddress}** resolved to **${result.companyName}** (${result.companyDomain}) with **${result.confidenceScore}** confidence. Industry: ${result.industryName}. Location: ${[result.city, result.region, result.countryCode].filter(Boolean).join(', ')}.`
    };
  })
  .build();
