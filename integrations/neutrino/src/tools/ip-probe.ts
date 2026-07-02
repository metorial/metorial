import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let ipProbeTool = SlateTool.create(spec, {
  name: 'IP Probe',
  key: 'ip_probe',
  description: `Perform a real-time network probe against an IP address to detect VPNs, proxies, hosting providers, and ISPs. Returns ASN details, provider classification, and geolocation.`,
  constraints: [
    'May take up to 30 seconds for slow target networks',
    'Rate limited to 10 requests per second'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IPv4 or IPv6 address to probe')
    })
  )
  .output(
    z.object({
      valid: z.boolean().describe('Whether the IP address is valid'),
      ip: z.string().describe('The probed IP address'),
      country: z.string().describe('Country name'),
      countryCode: z.string().describe('ISO 2-letter country code'),
      city: z.string().describe('City name'),
      region: z.string().describe('Region/state name'),
      isVpn: z.boolean().describe('VPN detected'),
      isProxy: z.boolean().describe('Proxy detected'),
      isHosting: z.boolean().describe('Hosted in a data center'),
      isIsp: z.boolean().describe('Regular ISP connection'),
      providerType: z
        .string()
        .describe(
          'Provider classification: isp, hosting, vpn, proxy, university, government, commercial, or unknown'
        ),
      providerDomain: z.string().describe('Primary domain of the provider'),
      providerDescription: z.string().describe('Description of the provider'),
      asn: z.string().describe('Autonomous System Number'),
      asCidr: z.string().describe('CIDR range for the ASN'),
      asCountryCode: z.string().describe('Country code for the ASN'),
      asDomains: z.array(z.string()).describe('Domains associated with the ASN')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.ipProbe({
      ip: ctx.input.ip
    });

    return {
      output: {
        valid: result.valid ?? false,
        ip: result.ip ?? ctx.input.ip,
        country: result.country ?? '',
        countryCode: result.countryCode ?? '',
        city: result.city ?? '',
        region: result.region ?? '',
        isVpn: result.isVpn ?? false,
        isProxy: result.isProxy ?? false,
        isHosting: result.isHosting ?? false,
        isIsp: result.isIsp ?? false,
        providerType: result.providerType ?? 'unknown',
        providerDomain: result.providerDomain ?? '',
        providerDescription: result.providerDescription ?? '',
        asn: result.asn ?? '',
        asCidr: result.asCidr ?? '',
        asCountryCode: result.asCountryCode ?? '',
        asDomains: result.asDomains ?? []
      },
      message: `**${result.ip}**: ${result.providerType} provider${result.providerDomain ? ` (${result.providerDomain})` : ''} in ${result.city ? `${result.city}, ` : ''}${result.country}.${result.isVpn ? ' ⚠️ VPN detected.' : ''}${result.isProxy ? ' ⚠️ Proxy detected.' : ''}${result.isHosting ? ' Hosted in data center.' : ''}`
    };
  })
  .build();
