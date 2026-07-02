import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let hostReputationTool = SlateTool.create(spec, {
  name: 'Host Reputation',
  key: 'host_reputation',
  description: `Check the reputation of an IP address, domain, or URL against 150+ DNSBL (DNS-based Blackhole List) services. Returns detailed blacklist status for each checked list.`,
  constraints: [
    'May take 5-20 seconds due to real-time external lookups, up to 30 seconds in some cases',
    'Rate limited to 1 request per second'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      host: z.string().describe('An IP address, domain name, FQDN, or URL to check'),
      listRating: z
        .number()
        .optional()
        .describe(
          'Only check lists matching this quality tier or better (1-3, where 1 is highest quality)'
        ),
      zones: z
        .string()
        .optional()
        .describe('Only check specific DNSBL zones/hosts (comma-separated)')
    })
  )
  .output(
    z.object({
      host: z.string().describe('The checked host'),
      isListed: z.boolean().describe('Whether the host appears on any blacklist'),
      listCount: z.number().describe('Number of DNSBLs where the host is listed'),
      lists: z
        .array(
          z.object({
            isListed: z.boolean().describe('Whether listed on this DNSBL'),
            listName: z.string().describe('Name of the DNSBL service'),
            listHost: z.string().describe('Hostname of the DNSBL'),
            listRating: z.number().describe('Quality rating (1-3)'),
            txtRecord: z.string().describe('TXT record response'),
            returnCode: z.string().describe('Return code'),
            responseTime: z.number().describe('Response time in milliseconds')
          })
        )
        .describe('Individual DNSBL check results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.hostReputation({
      host: ctx.input.host,
      listRating: ctx.input.listRating,
      zones: ctx.input.zones
    });

    let lists = (result.lists ?? []).map((l: any) => ({
      isListed: l.isListed ?? false,
      listName: l.listName ?? '',
      listHost: l.listHost ?? '',
      listRating: l.listRating ?? 3,
      txtRecord: l.txtRecord ?? '',
      returnCode: l.returnCode ?? '',
      responseTime: l.responseTime ?? 0
    }));

    return {
      output: {
        host: result.host ?? ctx.input.host,
        isListed: result.isListed ?? false,
        listCount: result.listCount ?? 0,
        lists
      },
      message: result.isListed
        ? `⚠️ **${result.host}** is listed on **${result.listCount}** blacklist(s) out of ${lists.length} checked.`
        : `✅ **${result.host}** is clean — not listed on any of the ${lists.length} blacklists checked.`
    };
  })
  .build();
