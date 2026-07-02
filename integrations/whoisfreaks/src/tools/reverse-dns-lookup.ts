import { SlateTool } from 'slates';
import { z } from 'zod';
import { WhoisFreaksClient } from '../lib/client';
import { spec } from '../spec';

export let reverseDnsLookup = SlateTool.create(spec, {
  name: 'Reverse DNS Lookup',
  key: 'reverse_dns_lookup',
  description: `Discover related domains by pivoting on DNS infrastructure signals. Search by IP address, mail exchange server, nameserver, CNAME, or other DNS record values to find all domains that share the same infrastructure.`,
  instructions: [
    'Set the recordType to match the kind of value you are searching for (e.g. "a" for IP addresses, "mx" for mail servers, "ns" for nameservers).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      recordType: z
        .string()
        .describe(
          'DNS record type to search by: "a", "aaaa", "mx", "ns", "cname", "txt", etc.'
        ),
      searchValue: z
        .string()
        .describe(
          'The value to search for (e.g. IP address, nameserver hostname, mail server)'
        ),
      page: z.number().optional().describe('Page number for paginated results')
    })
  )
  .output(
    z.object({
      reverseDnsResults: z.any().describe('Domains sharing the specified DNS infrastructure')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WhoisFreaksClient({ token: ctx.auth.token });
    let result = await client.reverseDnsLookup(
      ctx.input.recordType,
      ctx.input.searchValue,
      ctx.input.page
    );

    return {
      output: { reverseDnsResults: result },
      message: `Found reverse DNS results for **${ctx.input.recordType}** record value **${ctx.input.searchValue}**.`
    };
  })
  .build();
