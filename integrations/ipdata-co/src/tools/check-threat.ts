import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkThreat = SlateTool.create(spec, {
  name: 'Check IP Threat',
  key: 'check_threat',
  description: `Check threat intelligence for an IP address. Determines whether the IP is associated with Tor, proxies, VPNs, datacenters, known attackers, abusers, or other threats. Uses data from 100+ threat feeds. Useful for fraud detection, access control, and security monitoring.`,
  constraints: ['Free API keys are limited to 1,500 requests per day.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ipAddress: z.string().describe('IPv4 or IPv6 address to check for threats')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The checked IP address'),
      isTor: z.boolean().describe('Whether the IP is a known Tor exit node'),
      isIcloudRelay: z.boolean().describe('Whether the IP is an iCloud Private Relay address'),
      isProxy: z.boolean().describe('Whether the IP is a known proxy'),
      isDatacenter: z.boolean().describe('Whether the IP belongs to a datacenter'),
      isAnonymous: z.boolean().describe('Whether the IP is used for anonymous access'),
      isKnownAttacker: z.boolean().describe('Whether the IP is a known attacker'),
      isKnownAbuser: z.boolean().describe('Whether the IP is a known abuser'),
      isThreat: z.boolean().describe('Whether the IP is considered a threat overall'),
      isBogon: z.boolean().describe('Whether the IP is a bogon (unallocated/reserved) address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      useEuEndpoint: ctx.config.useEuEndpoint
    });

    let result = await client.lookupIp(ctx.input.ipAddress, ['ip', 'threat']);

    let threat = result.threat;
    let flags: string[] = [];
    if (threat?.isTor) flags.push('Tor');
    if (threat?.isProxy) flags.push('Proxy');
    if (threat?.isAnonymous) flags.push('Anonymous');
    if (threat?.isDatacenter) flags.push('Datacenter');
    if (threat?.isKnownAttacker) flags.push('Known Attacker');
    if (threat?.isKnownAbuser) flags.push('Known Abuser');
    if (threat?.isBogon) flags.push('Bogon');
    if (threat?.isIcloudRelay) flags.push('iCloud Relay');

    let threatSummary = threat?.isThreat
      ? `**Threat detected** — flagged as: ${flags.join(', ')}`
      : `**No threat detected**${flags.length > 0 ? ` (flags: ${flags.join(', ')})` : ''}`;

    return {
      output: {
        ip: result.ip,
        isTor: threat?.isTor ?? false,
        isIcloudRelay: threat?.isIcloudRelay ?? false,
        isProxy: threat?.isProxy ?? false,
        isDatacenter: threat?.isDatacenter ?? false,
        isAnonymous: threat?.isAnonymous ?? false,
        isKnownAttacker: threat?.isKnownAttacker ?? false,
        isKnownAbuser: threat?.isKnownAbuser ?? false,
        isThreat: threat?.isThreat ?? false,
        isBogon: threat?.isBogon ?? false
      },
      message: `Threat check for **${result.ip}**: ${threatSummary}.`
    };
  })
  .build();
