import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let assessIpRiskTool = SlateTool.create(spec, {
  name: 'Assess IP Risk',
  key: 'assess_ip_risk',
  description: `Assess the security risk and hazard profile of an IP address. Detects VPNs, proxies, Tor exit nodes, hosting networks, iCloud Private Relay, bogon addresses, and blacklist appearances.
Returns a comprehensive hazard report with individual threat indicators and an overall security threat classification.
If no IP is provided, the caller's own IP is assessed.`,
  instructions: [
    'The hostingLikelihood score ranges from 0 (unlikely) to 10 (very likely).',
    'securityThreat can be "low", "moderate", "high", or "unknown".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ip: z
        .string()
        .optional()
        .describe("IPv4 or IPv6 address to assess. If omitted, the caller's IP is used.")
    })
  )
  .output(
    z
      .object({
        ip: z.string().describe('The IP address assessed'),
        securityThreat: z
          .string()
          .optional()
          .describe('Overall threat level: low, moderate, high, or unknown'),
        isKnownAsTorServer: z.boolean().optional(),
        isKnownAsVpn: z.boolean().optional(),
        isKnownAsProxy: z.boolean().optional(),
        isSpamhausDrop: z.boolean().optional(),
        isSpamhausEdrop: z.boolean().optional(),
        isSpamhausAsnDrop: z.boolean().optional(),
        isBlacklistedUceprotect: z.boolean().optional(),
        isBlacklistedBlocklistDe: z.boolean().optional(),
        isKnownAsMailServer: z.boolean().optional(),
        isKnownAsPublicRouter: z.boolean().optional(),
        isBogon: z.boolean().optional(),
        isUnreachable: z.boolean().optional(),
        hostingLikelihood: z.number().optional().describe('Hosting likelihood score 0-10'),
        isHostingAsn: z.boolean().optional(),
        isCellular: z.boolean().optional(),
        iCloudPrivateRelay: z.boolean().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      localityLanguage: ctx.config.localityLanguage
    });

    let result = await client.ipHazardReport({ ip: ctx.input.ip });

    let ipAddr = result.ip || ctx.input.ip || 'caller IP';
    let hazard = result.hazardReport || {};
    let threat = result.securityThreat || 'unknown';

    let flags: string[] = [];
    if (hazard.isKnownAsVpn) flags.push('VPN');
    if (hazard.isKnownAsProxy) flags.push('Proxy');
    if (hazard.isKnownAsTorServer) flags.push('Tor');
    if (hazard.isBogon) flags.push('Bogon');
    if (hazard.iCloudPrivateRelay) flags.push('iCloud Private Relay');
    if (hazard.isSpamhausDrop || hazard.isSpamhausEdrop || hazard.isSpamhausAsnDrop)
      flags.push('Spamhaus listed');
    if (hazard.isBlacklistedUceprotect || hazard.isBlacklistedBlocklistDe)
      flags.push('Blacklisted');

    let flagsSummary = flags.length > 0 ? flags.join(', ') : 'none';

    return {
      output: {
        ip: ipAddr,
        securityThreat: threat,
        ...hazard
      },
      message: `**${ipAddr}** risk assessment: threat level **${threat}**. Detected flags: ${flagsSummary}. Hosting likelihood: ${hazard.hostingLikelihood ?? 'N/A'}/10.`
    };
  })
  .build();
