import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { leadNumber, leadString } from '../lib/responses';
import { datasetIdSchema, getLegacyDatasetId } from '../lib/schemas';
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
      ipAddress: z.string().describe('The IPv4 or IPv6 address to look up'),
      datasetId: datasetIdSchema
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
      datasetId: ctx.input.datasetId ?? getLegacyDatasetId(ctx.config)
    });

    let result = await client.lookupIp(ctx.input.ipAddress);

    let output = {
      companyDomain: leadString(result.ipDomain),
      organizationName: leadString(result.ipOrganization),
      country: leadString(result.ipCountryName),
      countryCode: leadString(result.ipCountryCode),
      region: leadString(result.ipRegionName),
      city: leadString(result.ipCity),
      subContinent: leadString(result.ipSubContinent),
      latitude: leadString(result.ipLatitude),
      longitude: leadString(result.ipLongitude),
      timezone: leadString(result.ipTimezone),
      isp: leadString(result.ipIsp),
      ipRange: leadString(result.ipRange),
      usageType: leadString(result.ipUsageType),
      searchedIp: leadString(result.searchIp),
      responseTimeMs: leadNumber(result.searchResponseTimeMs)
    };

    let orgLabel = output.organizationName || output.companyDomain || 'Unknown';
    return {
      output,
      message: `IP **${ctx.input.ipAddress}** identified as **${orgLabel}**${output.city ? ` in ${output.city}` : ''}${output.country ? `, ${output.country}` : ''}.`
    };
  })
  .build();
