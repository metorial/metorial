import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { spec } from '../spec';

export let ipLookup = SlateTool.create(spec, {
  name: 'IP Lookup',
  key: 'ip_lookup',
  description: `Look up company and location information for an IP address. Returns company domain, organization name, geographic data (country, region, city, coordinates), ISP info, and IP usage type. Use the returned domain with the Domain Lookup tool for full firmographic enrichment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('The IP address to look up')
    })
  )
  .output(
    z.object({
      companyDomain: z.string().optional().describe('Company/organization domain'),
      organizationName: z.string().optional().describe('Organization name'),
      country: z.string().optional().describe('Country name'),
      countryCode: z.string().optional().describe('ISO country code'),
      region: z.string().optional().describe('Region/state name'),
      city: z.string().optional().describe('City name'),
      subContinent: z.string().optional().describe('Sub-continent'),
      latitude: z.string().optional().describe('Latitude'),
      longitude: z.string().optional().describe('Longitude'),
      timezone: z.string().optional().describe('Timezone'),
      isp: z.string().optional().describe('Internet Service Provider'),
      ipRange: z.string().optional().describe('IP address range block'),
      usageType: z
        .string()
        .optional()
        .describe('Type of IP usage (residential, commercial, etc.)'),
      searchedIp: z.string().optional().describe('The IP address that was searched'),
      responseTimeMs: z.number().optional().describe('API response time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.config.datasetId
    });

    let result = await client.lookupIp(ctx.input.ipAddress);

    let output = {
      companyDomain: result.ipDomain,
      organizationName: result.ipOrganization,
      country: result.ipCountryName,
      countryCode: result.ipCountryCode,
      region: result.ipRegionName,
      city: result.ipCity,
      subContinent: result.ipSubContinent,
      latitude: result.ipLatitude != null ? String(result.ipLatitude) : undefined,
      longitude: result.ipLongitude != null ? String(result.ipLongitude) : undefined,
      timezone: result.ipTimezone,
      isp: result.ipIsp,
      ipRange: result.ipRange,
      usageType: result.ipUsageType,
      searchedIp: result.searchIp,
      responseTimeMs:
        result.searchResponseTimeMs != null ? Number(result.searchResponseTimeMs) : undefined
    };

    let orgLabel = output.organizationName || output.companyDomain || 'Unknown';
    return {
      output,
      message: `IP **${ctx.input.ipAddress}** identified as **${orgLabel}**${output.city ? ` in ${output.city}` : ''}${output.country ? `, ${output.country}` : ''}.`
    };
  })
  .build();
