import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    package: z
      .enum(['PX1', 'PX2', 'PX3', 'PX4', 'PX5', 'PX6', 'PX7', 'PX8', 'PX9', 'PX10', 'PX11'])
      .default('PX11')
      .describe(
        'The IP2Proxy package tier to use for queries. PX1 returns basic proxy status and country. Higher tiers return more details (ISP, domain, usage type, ASN, threat, VPN provider). PX11 returns all available fields.'
      ),
    responseFormat: z
      .enum(['json', 'xml'])
      .default('json')
      .describe('Response format for API queries.')
  })
);
