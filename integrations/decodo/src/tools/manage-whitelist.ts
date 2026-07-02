import { SlateTool } from 'slates';
import { z } from 'zod';
import { PublicApiClient } from '../lib/public-api-client';
import { spec } from '../spec';

let whitelistedIpSchema = z.object({
  whitelistId: z.number().describe('Whitelist entry ID'),
  ip: z.string().describe('Whitelisted IP address'),
  enabled: z.boolean().describe('Whether the whitelist entry is enabled'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listWhitelistedIps = SlateTool.create(spec, {
  name: 'List Whitelisted IPs',
  key: 'list_whitelisted_ips',
  description: `List all IP addresses that are whitelisted for proxy authentication. Whitelisted IPs can connect to proxies without username/password credentials.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      whitelistedIps: z.array(whitelistedIpSchema).describe('List of whitelisted IP addresses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    let whitelistedIps = await client.listWhitelistedIps();

    return {
      output: { whitelistedIps },
      message: `Found **${whitelistedIps.length}** whitelisted IP(s).`
    };
  })
  .build();

export let addWhitelistedIps = SlateTool.create(spec, {
  name: 'Add Whitelisted IPs',
  key: 'add_whitelisted_ips',
  description: `Add one or more IP addresses to the proxy whitelist. Whitelisted IPs can connect to proxies without username/password credentials.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ips: z.array(z.string()).describe('List of IP addresses to whitelist')
    })
  )
  .output(
    z.object({
      added: z.boolean().describe('Whether the IPs were successfully added'),
      ips: z.array(z.string()).describe('IP addresses that were whitelisted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    await client.addWhitelistedIps(ctx.input.ips);

    return {
      output: {
        added: true,
        ips: ctx.input.ips
      },
      message: `Successfully whitelisted **${ctx.input.ips.length}** IP(s): ${ctx.input.ips.join(', ')}.`
    };
  })
  .build();

export let removeWhitelistedIp = SlateTool.create(spec, {
  name: 'Remove Whitelisted IP',
  key: 'remove_whitelisted_ip',
  description: `Remove an IP address from the proxy whitelist by its whitelist entry ID. Use **List Whitelisted IPs** to find the entry ID.`,
  constraints: ['Requires API Key authentication (Public API).'],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      whitelistId: z
        .number()
        .describe('Whitelist entry ID to remove (use List Whitelisted IPs to find this)')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the removal was successful'),
      whitelistId: z.number().describe('ID of the removed whitelist entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PublicApiClient(ctx.auth.token);
    await client.deleteWhitelistedIp(ctx.input.whitelistId);

    return {
      output: {
        removed: true,
        whitelistId: ctx.input.whitelistId
      },
      message: `Whitelist entry \`${ctx.input.whitelistId}\` removed successfully.`
    };
  })
  .build();
