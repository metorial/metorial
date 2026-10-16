import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapGeolocation, parseResponse, providerDataSchema } from '../lib/responses';
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
      timeZone: z.string().describe('UTC offset including daylight saving time'),
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
      timezoneInfo: timezoneInfoSchema,
      fraudScore: z
        .number()
        .optional()
        .describe('Fraud score from 0 to 99; higher is riskier'),
      asInfo: providerDataSchema.describe(
        'Autonomous system metadata, including CIDR and usage type'
      ),
      continent: providerDataSchema.describe('Continent details and requested translation'),
      country: providerDataSchema.describe(
        'Country details, currency, language, and translation'
      ),
      region: providerDataSchema.describe('Region details and requested translation'),
      city: providerDataSchema.describe('City details and requested translation'),
      geotargeting: providerDataSchema.describe('Geotargeting metro information'),
      providerData: providerDataSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = parseResponse(
      z.object({ ip: z.string().min(1) }).passthrough(),
      await client.getGeolocation(ctx.input.ipAddress, ctx.config.language),
      'geolocation'
    );
    let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);
    let objectValue = (value: unknown) => (isApiErrorRecord(value) ? value : undefined);
    let proxy = objectValue(result.proxy);
    let timezone = objectValue(result.time_zone_info);
    let fraudScore = typeof result.fraud_score === 'number' ? result.fraud_score : undefined;
    let mappedProxy = proxy
      ? {
          lastSeen: proxy.last_seen,
          proxyType: proxy.proxy_type,
          threat: proxy.threat,
          provider: proxy.provider,
          isVpn: proxy.is_vpn,
          isTor: proxy.is_tor,
          isDataCenter: proxy.is_data_center,
          isPublicProxy: proxy.is_public_proxy,
          isWebProxy: proxy.is_web_proxy,
          isWebCrawler: proxy.is_web_crawler,
          isResidentialProxy: proxy.is_residential_proxy,
          isConsumerPrivacyNetwork: proxy.is_consumer_privacy_network,
          isEnterprisePrivateNetwork: proxy.is_enterprise_private_network,
          isSpammer: proxy.is_spammer,
          isScanner: proxy.is_scanner,
          isBotnet: proxy.is_botnet,
          fraudScore: fraudScore ?? proxy.fraud_score
        }
      : undefined;
    let mappedTimezone = timezone
      ? {
          olson: timezone.olson,
          currentTime: timezone.current_time,
          gmtOffset: timezone.gmt_offset,
          isDst: timezone.is_dst,
          sunrise: timezone.sunrise,
          sunset: timezone.sunset
        }
      : undefined;
    // Optional legacy summaries require complete scalar data. Preserve nulls and newer fields in providerData.
    let parsedProxy = proxySchema.safeParse(mappedProxy);
    let parsedTimezone = timezoneInfoSchema.safeParse(mappedTimezone);
    let output = {
      ip: result.ip,
      ...mapGeolocation(result),
      isp: stringValue(result.isp),
      domainName: stringValue(result.domain),
      netSpeed: stringValue(result.net_speed),
      usageType: stringValue(result.usage_type),
      addressType: stringValue(result.address_type),
      district: stringValue(result.district),
      proxy: parsedProxy.success ? parsedProxy.data : undefined,
      timezoneInfo: parsedTimezone.success ? parsedTimezone.data : undefined,
      fraudScore,
      asInfo: objectValue(result.as_info),
      continent: objectValue(result.continent),
      country: objectValue(result.country),
      region: objectValue(result.region),
      city: objectValue(result.city),
      geotargeting: objectValue(result.geotargeting),
      providerData: result
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
