import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApiAccess = SlateTool.create(spec, {
  name: 'Get API Access',
  key: 'get_api_access',
  description:
    'Inspect the current API key permissions and accessible stores for this Simla.com account.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountUrl: z.string().describe('Connected Simla.com account URL'),
      scopes: z.array(z.string()).describe('Permissions allowed for the API key'),
      siteAccess: z
        .enum(['access_full', 'access_selective'])
        .describe('Access to all stores or selected stores'),
      sitesAvailable: z.array(z.string()).describe('Symbolic codes of accessible stores'),
      credentials: z.array(z.string()).describe('Legacy list of available API methods')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      site: ctx.config.site
    });
    let access = await client.getCredentials();
    return {
      output: { accountUrl: `https://${ctx.config.subdomain}.simla.com`, ...access },
      message: `Retrieved API access for **${ctx.config.subdomain}**.`
    };
  })
  .build();
