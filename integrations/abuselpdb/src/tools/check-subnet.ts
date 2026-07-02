import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reportedAddressSchema = z.object({
  ipAddress: z.string().describe('Reported IP address within the subnet'),
  numReports: z.number().describe('Number of abuse reports for this IP'),
  mostRecentReport: z.string().describe('Timestamp of the most recent report'),
  abuseConfidenceScore: z.number().describe('Abuse confidence score (0–100)'),
  countryCode: z.string().nullable().describe('ISO 3166 alpha-2 country code')
});

export let checkSubnet = SlateTool.create(spec, {
  name: 'Check Subnet',
  key: 'check_subnet',
  description: `Check an entire subnet (CIDR notation) for IP addresses that have been reported for abuse. Returns network details and a list of reported addresses within the block with their abuse scores.

Use this to assess the reputation of a network range.`,
  instructions: [
    'Provide the network in CIDR notation (e.g., "192.168.1.0/24").',
    'Free accounts are limited to /24 subnets; paid plans support up to /16.'
  ],
  constraints: [
    'Free tier: maximum /24 subnet size',
    'Basic tier: maximum /20 subnet size',
    'Premium tier: maximum /16 subnet size'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      network: z.string().describe('Subnet in CIDR notation (e.g., "192.168.1.0/24")'),
      maxAgeInDays: z
        .number()
        .min(1)
        .max(365)
        .optional()
        .describe('Lookback window in days (1–365, default 30)')
    })
  )
  .output(
    z.object({
      networkAddress: z.string().describe('Network address of the subnet'),
      netmask: z.string().describe('Netmask of the subnet'),
      minAddress: z.string().describe('First address in the subnet range'),
      maxAddress: z.string().describe('Last address in the subnet range'),
      numPossibleHosts: z.number().describe('Number of possible hosts in the subnet'),
      addressSpaceDesc: z.string().describe('Description of the address space'),
      reportedAddresses: z
        .array(reportedAddressSchema)
        .describe('List of reported IP addresses within the subnet')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.checkBlock({
      network: ctx.input.network,
      maxAgeInDays: ctx.input.maxAgeInDays
    });

    let data = result.data;

    return {
      output: {
        networkAddress: data.networkAddress,
        netmask: data.netmask,
        minAddress: data.minAddress,
        maxAddress: data.maxAddress,
        numPossibleHosts: data.numPossibleHosts,
        addressSpaceDesc: data.addressSpaceDesc,
        reportedAddresses: data.reportedAddress ?? []
      },
      message: `Subnet **${data.networkAddress}/${data.netmask}** contains **${(data.reportedAddress ?? []).length}** reported addresses out of **${data.numPossibleHosts}** possible hosts.`
    };
  })
  .build();
