import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDomains = SlateTool.create(spec, {
  name: 'List Domains',
  key: 'list_domains',
  description: `Lists all custom domains configured in the workspace. Custom domains are used as branded short link hosts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z
        .array(
          z.object({
            name: z.string().describe('Domain name'),
            faviconUrl: z.string().optional().nullable().describe('Favicon URL for the domain')
          })
        )
        .describe('Configured custom domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listDomains();
    let domains = (Array.isArray(result) ? result : []).map((d: any) => ({
      name: d.name,
      faviconUrl: d.favicon_url
    }));

    return {
      output: { domains },
      message: `Found **${domains.length}** custom domain(s)`
    };
  })
  .build();
