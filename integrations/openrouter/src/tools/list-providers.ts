import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let providerSchema = z.object({
  slug: z.string().optional().describe('Provider slug used in routing preferences'),
  name: z.string().describe('Provider name'),
  headquarters: z.string().optional().describe('Provider headquarters country or region'),
  datacenters: z.array(z.string()).optional().describe('Provider datacenter regions'),
  privacyPolicyUrl: z.string().optional().describe('Provider privacy policy URL'),
  statusPageUrl: z.string().optional().describe('Provider status page URL'),
  termsOfServiceUrl: z.string().optional().describe('Provider terms of service URL')
});

export let listProviders = SlateTool.create(spec, {
  name: 'List Providers',
  key: 'list_providers',
  description:
    'List OpenRouter upstream model providers and metadata useful for provider routing, privacy review, status checks, and guardrail/provider allowlists.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      providers: z.array(providerSchema).describe('Available OpenRouter providers'),
      totalCount: z.number().describe('Total provider count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let providers = (await client.listProviders()).map(provider => ({
      slug: (provider.slug as string) || undefined,
      name: (provider.name as string) || 'Unknown provider',
      headquarters: (provider.headquarters as string) || undefined,
      datacenters: (provider.datacenters as string[]) || undefined,
      privacyPolicyUrl: (provider.privacy_policy_url as string) || undefined,
      statusPageUrl: (provider.status_page_url as string) || undefined,
      termsOfServiceUrl: (provider.terms_of_service_url as string) || undefined
    }));

    return {
      output: {
        providers,
        totalCount: providers.length
      },
      message: `Found **${providers.length}** provider(s).`
    };
  })
  .build();
