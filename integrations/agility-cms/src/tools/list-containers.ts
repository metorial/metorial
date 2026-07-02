import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let listContainers = SlateTool.create(spec, {
  name: 'List Containers',
  key: 'list_containers',
  description: `Lists all content containers in the Agility CMS instance. Containers hold content lists and define how content models are used. Requires OAuth authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      containers: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of container definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    let result = await client.listContainers();
    let containers = Array.isArray(result) ? result : [];

    return {
      output: { containers },
      message: `Retrieved **${containers.length}** container(s)`
    };
  })
  .build();
