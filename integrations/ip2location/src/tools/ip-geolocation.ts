import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let proxySchema = z
  .object({
    lastSeen: z.number().describe('Number of days since the proxy was last seen'),
    proxyType: z.string().describe('Type of proxy detected'),
    threat: z.string().describe('Threat type associated with the proxy'),
    provider: z.string().describe('Name of the proxy provider'),
    isVpn: z.boolean().describe('Whether the IP is a VPN'),
    isTor: z.boolean().describe('Whether the IP is a TOR exit node'),
    isDataCenter: z.boolean().describe('Whether the IP belongs to a data center'),
    isPublicProxy: z.boolean().describe('Whether the IP is a public proxy'),
    isWebProxy: z.boolean().describe('Whether the IP is a web proxy'),
    isWebCrawler: z.boolean().describe('Whether the IP is a web crawler'),
    isResidentialProxy: z.boolean().describe('Whether the IP is a residential proxy'),
    isConsumerPrivacyNetwork: z
      .boolean()
      .describe('Whether the IP is a consumer privacy network'),
    isEnterprisePrivateNetwork: z
      .boolean()
      .describe('Whether the IP is an enterprise private network'),
    isSpammer: z.boolean().describe('Whether the IP is associated with spam'),
    isScanner: z.boolean().describe('Whether the IP is a scanner'),
    isBotnet: z.boolean().describe('Whether the IP is part of a botnet'),
    fraudScore: z.number().describe('Fraud score from 0 to 99, where higher means riskier')
  })
  .optional()
  .describe('Proxy and threat detection data (available on Plus and Security plans)');

let timezoneInfoSchema = z
  .object({
    olson: z.string().describe('Olson timezone identifier'),
    currentTime: z.string().describe('Current local time at the IP location'),
    gmtOffset: z.number().describe('GMT offset in seconds'),
    isDst: z.boolean().describe('Whether daylight saving time is active'),
    sunrise: z.string().describe('Local sunrise time'),
    sunset: z.string().describe('Local sunset time')
  })
  .optional()
  .describe('Detailed timezone information');

export let ipGeolocation = SlateTool.create(spec, {
  name: 'IP Geolocation Lookup',
  key: 'ip_geolocation_lookup',
  description: `Look up the geographic location, network metadata, and proxy/threat data for a single IP address. Returns country, region, city, coordinates, timezone, ISP, ASN, and proxy detection information. Supports both IPv4 and IPv6 addresses.

Available data varies by plan tier - higher plans include proxy detection, continent/country details with translations, and mobile carrier data.`,
  instructions: [
    'Provide a valid IPv4 or IPv6 address to look up.',
    'Geolocation coordinates represent the center of population areas and should not be used to identify specific street addresses.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to look up')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('Queried IP address'),
      countryCode: z.string().describe('ISO 3166-1 alpha-2 country code'),
      countryName: z.string().describe('Full country name'),
      regionName: z.string().describe('Region or state name'),
      cityName: z.string().describe('City name'),
      latitude: z.number().describe('Latitude coordinate'),
      longitude: z.number().describe('Longitude coordinate'),
      zipCode: z.string().describe('ZIP or postal code'),
      timeZone: z.string().describe('Timezone identifier'),
      asn: z.string().describe('Autonomous System Number'),
      asName: z.string().describe('Autonomous System name'),
      isp: z.string().optional().describe('Internet Service Provider name'),
      domainName: z.string().optional().describe('Associated domain name'),
      netSpeed: z.string().optional().describe('Network speed classification'),
      usageType: z
        .string()
        .optional()
        .describe('IP usage type (e.g., Commercial, ISP, Education)'),
      addressType: z.string().optional().describe('IP address type (Unicast, Anycast, etc.)'),
      district: z.string().optional().describe('District name'),
      isProxy: z.boolean().describe('Whether the IP is detected as a proxy'),
      proxy: proxySchema,
      timezoneInfo: timezoneInfoSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getGeolocation(ctx.input.ipAddress, ctx.config.language);

    let output = {
      ip: result.ip,
      countryCode: result.country_code || '',
      countryName: result.country_name || '',
      regionName: result.region_name || '',
      cityName: result.city_name || '',
      latitude: result.latitude || 0,
      longitude: result.longitude || 0,
      zipCode: result.zip_code || '',
      timeZone: result.time_zone || '',
      asn: result.asn || '',
      asName: result.as || '',
      isp: result.isp || undefined,
      domainName: result.domain || undefined,
      netSpeed: result.net_speed || undefined,
      usageType: result.usage_type || undefined,
      addressType: result.address_type || undefined,
      district: result.district || undefined,
      isProxy: result.is_proxy || false,
      proxy: result.proxy
        ? {
            lastSeen: result.proxy.last_seen,
            proxyType: result.proxy.proxy_type,
            threat: result.proxy.threat,
            provider: result.proxy.provider,
            isVpn: result.proxy.is_vpn,
            isTor: result.proxy.is_tor,
            isDataCenter: result.proxy.is_data_center,
            isPublicProxy: result.proxy.is_public_proxy,
            isWebProxy: result.proxy.is_web_proxy,
            isWebCrawler: result.proxy.is_web_crawler,
            isResidentialProxy: result.proxy.is_residential_proxy,
            isConsumerPrivacyNetwork: result.proxy.is_consumer_privacy_network,
            isEnterprisePrivateNetwork: result.proxy.is_enterprise_private_network,
            isSpammer: result.proxy.is_spammer,
            isScanner: result.proxy.is_scanner,
            isBotnet: result.proxy.is_botnet,
            fraudScore: result.proxy.fraud_score
          }
        : undefined,
      timezoneInfo: result.time_zone_info
        ? {
            olson: result.time_zone_info.olson,
            currentTime: result.time_zone_info.current_time,
            gmtOffset: result.time_zone_info.gmt_offset,
            isDst: result.time_zone_info.is_dst,
            sunrise: result.time_zone_info.sunrise,
            sunset: result.time_zone_info.sunset
          }
        : undefined
    };

    let locationParts = [output.cityName, output.regionName, output.countryName].filter(
      Boolean
    );
    let locationStr = locationParts.join(', ');
    let proxyStr = output.isProxy
      ? ` | **Proxy detected** (type: ${output.proxy?.proxyType || 'unknown'}, fraud score: ${output.proxy?.fraudScore ?? 'N/A'})`
      : ' | No proxy detected';

    return {
      output,
      message: `**${output.ip}** is located in **${locationStr}** (${output.latitude}, ${output.longitude})${proxyStr}`
    };
  })
  .build();
