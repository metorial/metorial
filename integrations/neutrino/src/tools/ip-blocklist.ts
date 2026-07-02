import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let ipBlocklistTool = SlateTool.create(spec, {
  name: 'IP Blocklist Check',
  key: 'ip_blocklist',
  description: `Check if an IP address is on known blocklists, detecting threats like Tor, proxies, VPNs, botnets, malware, spyware, spam, and exploit scanners. Useful for fraud detection and security.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z.string().describe('IPv4 or IPv6 address to check'),
      vpnLookup: z.boolean().optional().describe('Enable public VPN provider detection')
    })
  )
  .output(
    z.object({
      ip: z.string().describe('The checked IP address'),
      isListed: z.boolean().describe('Whether the IP appears on any blocklist'),
      listCount: z.number().describe('Number of blocklists the IP appears on'),
      blocklists: z
        .array(z.string())
        .describe(
          'Blocklist categories: tor, proxy, vpn, bot, spam-bot, exploit-bot, hijacked, malware, spyware, spider, dshield'
        ),
      isProxy: z.boolean().describe('Detected as anonymous proxy'),
      isTor: z.boolean().describe('Detected as Tor node'),
      isVpn: z.boolean().describe('Detected as VPN'),
      isMalware: z.boolean().describe('Associated with malware'),
      isSpyware: z.boolean().describe('Associated with spyware'),
      isBot: z.boolean().describe('Detected as botnet/malicious bot'),
      isSpamBot: z.boolean().describe('Detected as spam bot'),
      isExploitBot: z.boolean().describe('Detected as exploit scanner'),
      isHijacked: z.boolean().describe('Part of a hijacked netblock'),
      isSpider: z.boolean().describe('Detected as hostile spider'),
      isDshield: z.boolean().describe('DShield attack source'),
      lastSeen: z.number().describe('Unix timestamp of last detection (0 if not listed)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.ipBlocklist({
      ip: ctx.input.ip,
      vpnLookup: ctx.input.vpnLookup
    });

    return {
      output: {
        ip: result.ip,
        isListed: result.isListed,
        listCount: result.listCount ?? 0,
        blocklists: result.blocklists ?? [],
        isProxy: result.isProxy ?? false,
        isTor: result.isTor ?? false,
        isVpn: result.isVpn ?? false,
        isMalware: result.isMalware ?? false,
        isSpyware: result.isSpyware ?? false,
        isBot: result.isBot ?? false,
        isSpamBot: result.isSpamBot ?? false,
        isExploitBot: result.isExploitBot ?? false,
        isHijacked: result.isHijacked ?? false,
        isSpider: result.isSpider ?? false,
        isDshield: result.isDshield ?? false,
        lastSeen: result.lastSeen ?? 0
      },
      message: result.isListed
        ? `⚠️ **${result.ip}** is listed on **${result.listCount}** blocklist(s): ${(result.blocklists ?? []).join(', ')}.`
        : `✅ **${result.ip}** is not listed on any blocklists.`
    };
  })
  .build();
