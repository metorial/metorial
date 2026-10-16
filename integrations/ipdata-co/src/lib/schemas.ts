import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let threatEnrichmentShape = {
  isVpn: z
    .boolean()
    .optional()
    .describe('Whether the IP is a VPN; available on eligible plans'),
  blocklists: z
    .array(
      z
        .object({
          name: z.string().optional().describe('Blocklist name'),
          site: z.string().optional().describe('Blocklist website'),
          type: z.string().optional().describe('Blocklist type')
        })
        .passthrough()
    )
    .optional()
    .describe('Provider blocklist matches'),
  scores: z
    .object({
      vpnScore: z.number().optional().describe('VPN probability percentage'),
      proxyScore: z.number().optional().describe('Proxy probability percentage'),
      threatScore: z.number().optional().describe('Threat probability percentage'),
      trustScore: z.number().optional().describe('Trust score from 0 to 100')
    })
    .passthrough()
    .optional()
    .describe('Provider reputation scores, on eligible plans')
};

export let parseResponse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError('Ipdata.co returned incomplete or invalid lookup data.', {
      reason: 'invalid_provider_response'
    });
  }
  return result.data;
};
