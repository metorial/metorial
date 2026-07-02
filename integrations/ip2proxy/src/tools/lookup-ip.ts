import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let lookupIp = SlateTool.create(spec, {
  name: 'Lookup IP Proxy Status',
  key: 'lookup_ip',
  description: `Query an IPv4 or IPv6 address to detect proxy, VPN, TOR, or other anonymizer usage. Returns proxy type, geolocation, ISP, ASN, threat classification, and VPN provider details depending on the configured package tier.

If no IP address is provided, the server's own IP is used for lookup.

The amount of detail returned depends on the package tier configured in the integration settings (PX1 through PX11).`,
  instructions: [
    "Provide an IPv4 or IPv6 address to check. Omit the IP to query the server's own address.",
    'You can override the default package tier per-query to control the detail level and credit cost.'
  ],
  constraints: [
    'Each query deducts credits from your account based on the package tier used.',
    'Higher package tiers (e.g., PX11) return more fields but cost more credits per query.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z
        .string()
        .optional()
        .describe(
          "The IPv4 or IPv6 address to look up. If omitted, the server's own IP is queried."
        ),
      package: z
        .enum(['PX1', 'PX2', 'PX3', 'PX4', 'PX5', 'PX6', 'PX7', 'PX8', 'PX9', 'PX10', 'PX11'])
        .optional()
        .describe(
          'Override the default package tier for this query. Controls which fields are returned and credits consumed.'
        )
    })
  )
  .output(
    z.object({
      response: z.string().describe('Response status from the API (e.g., "OK" for success).'),
      isProxy: z
        .string()
        .describe('Whether the IP is a proxy: "YES", "NO", or "-" if not applicable.'),
      proxyType: z
        .string()
        .optional()
        .describe(
          'Type of proxy detected: VPN, TOR, DCH, PUB, WEB, SES, RES, CPN, EPN, or "-" if not a proxy.'
        ),
      countryCode: z.string().optional().describe('Two-letter ISO 3166-1 country code.'),
      countryName: z.string().optional().describe('Full country name.'),
      regionName: z.string().optional().describe('Region or state name.'),
      cityName: z.string().optional().describe('City name.'),
      isp: z.string().optional().describe('Internet Service Provider name.'),
      domain: z.string().optional().describe('Domain name associated with the IP.'),
      usageType: z
        .string()
        .optional()
        .describe(
          'Usage type classification (e.g., ISP, COM, ORG, GOV, MIL, EDU, LIB, CDN, DCH, SES, RSV).'
        ),
      asn: z.string().optional().describe('Autonomous System Number.'),
      asName: z.string().optional().describe('Autonomous System name.'),
      lastSeen: z
        .string()
        .optional()
        .describe('Number of days since the proxy was last seen.'),
      threat: z
        .string()
        .optional()
        .describe('Threat classification (e.g., SPAM, SCANNER, BOTNET, or "-").'),
      vpnProvider: z
        .string()
        .optional()
        .describe('Name of the VPN provider, if identified (PX11 only).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let packageTier = ctx.input.package || ctx.config.package;

    let result = await client.lookupProxy({
      ip: ctx.input.ipAddress,
      package: packageTier,
      format: ctx.config.responseFormat
    });

    let output = {
      response: result.response || '',
      isProxy: result.isProxy || '',
      proxyType: result.proxyType || undefined,
      countryCode: result.countryCode || undefined,
      countryName: result.countryName || undefined,
      regionName: result.regionName || undefined,
      cityName: result.cityName || undefined,
      isp: result.isp || undefined,
      domain: result.domain || undefined,
      usageType: result.usageType || undefined,
      asn: result.asn || undefined,
      asName: result.as || undefined,
      lastSeen: result.lastSeen || undefined,
      threat: result.threat || undefined,
      vpnProvider: result.provider || undefined
    };

    let ipLabel = ctx.input.ipAddress || 'server IP';
    let proxyStatus = result.isProxy === 'YES' ? 'a proxy' : 'not a proxy';
    let proxyDetail =
      result.proxyType && result.proxyType !== '-' ? ` (type: **${result.proxyType}**)` : '';
    let locationParts = [result.cityName, result.regionName, result.countryName].filter(
      p => p && p !== '-'
    );
    let location = locationParts.length > 0 ? ` Located in ${locationParts.join(', ')}.` : '';

    return {
      output,
      message: `**${ipLabel}** is ${proxyStatus}${proxyDetail}.${location}`
    };
  })
  .build();
