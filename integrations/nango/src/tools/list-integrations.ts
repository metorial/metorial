import { SlateTool } from 'slates';
import { z } from 'zod';
import { NangoClient } from '../lib/client';
import { spec } from '../spec';

export let listIntegrations = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `Lists all configured integrations in the current Nango environment. Each integration ties a provider (e.g., Slack, GitHub) to an auth configuration. Use this to discover available integrations and their provider details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      integrations: z.array(
        z.object({
          uniqueKey: z.string().describe('The integration identifier'),
          displayName: z.string().describe('Human-readable provider name'),
          provider: z.string().describe('The Nango API configuration name'),
          logo: z.string().describe('SVG logo URL'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          updatedAt: z.string().describe('ISO 8601 last update timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NangoClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listIntegrations();

    let integrations = result.data.map(i => ({
      uniqueKey: i.unique_key,
      displayName: i.display_name,
      provider: i.provider,
      logo: i.logo,
      createdAt: i.created_at,
      updatedAt: i.updated_at
    }));

    return {
      output: { integrations },
      message: `Found **${integrations.length}** integration(s).`
    };
  })
  .build();
