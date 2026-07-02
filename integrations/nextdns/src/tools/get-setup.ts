import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let getSetup = SlateTool.create(spec, {
  name: 'Get Setup Info',
  key: 'get_setup',
  description: `Retrieve connection and setup information for a NextDNS profile. Returns DNS server addresses (IPv4/IPv6), linked IP details, DDNS hostname, DNS stamp, and other configuration needed to connect devices to the profile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID'),
      fingerprint: z.string().optional().describe('Unique profile fingerprint'),
      ipv4: z.array(z.string()).optional().describe('IPv4 DNS server addresses'),
      ipv6: z.array(z.string()).optional().describe('IPv6 DNS server addresses'),
      linkedIpDnsServers: z
        .array(z.string())
        .optional()
        .describe('DNS servers for linked IP mode'),
      ddnsHostname: z.string().optional().describe('Dynamic DNS hostname'),
      linkedIp: z.string().optional().describe('Currently linked IP address'),
      linkedIpUpdateToken: z.string().optional().describe('Token for updating linked IP'),
      dnsStamp: z.string().optional().describe('DNS stamp for DNSCrypt/DoH configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let result = await client.getSetup(ctx.input.profileId);
    let data = result.data || result;

    return {
      output: {
        profileId: data.id || ctx.input.profileId,
        fingerprint: data.fingerprint,
        ipv4: data.ipv4,
        ipv6: data.ipv6,
        linkedIpDnsServers: data.linkedIpDNSServers,
        ddnsHostname: data.ddnsHostname,
        linkedIp: data.linkedIp,
        linkedIpUpdateToken: data.linkedIpUpdateToken,
        dnsStamp: data.dnsStamp
      },
      message: `Retrieved setup info for profile \`${ctx.input.profileId}\`.`
    };
  })
  .build();
