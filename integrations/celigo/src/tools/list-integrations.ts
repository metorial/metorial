import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIntegrations = SlateTool.create(spec, {
  name: 'List Integrations',
  key: 'list_integrations',
  description: `Retrieve all integrations in your Celigo account. Integrations serve as organizational containers for flows and connections.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      integrations: z
        .array(
          z.object({
            integrationId: z.string().describe('Unique integration identifier'),
            name: z.string().optional().describe('Integration name'),
            lastModified: z.string().optional().describe('Last modification timestamp'),
            readme: z.string().optional().describe('Integration description/readme')
          })
        )
        .describe('List of integrations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let integrations = await client.listIntegrations();

    let mapped = integrations.map((i: any) => ({
      integrationId: i._id,
      name: i.name,
      lastModified: i.lastModified,
      readme: i.readme
    }));

    return {
      output: { integrations: mapped },
      message: `Found **${mapped.length}** integration(s).`
    };
  })
  .build();
