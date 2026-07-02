import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConfigurationTool = SlateTool.create(spec, {
  name: 'Get Service Configuration',
  key: 'get_configuration',
  description: `Retrieve Buffer's current service configuration. Returns supported social networks, character limits, schedule limits, supported interaction types, and analytics filters per network.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      services: z
        .record(z.string(), z.any())
        .describe(
          'Configuration for each supported social network service, including character limits, schedule limits, icons, and URLs'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let config = await client.getConfiguration();

    let serviceNames = Object.keys(config.services || config);

    return {
      output: {
        services: config.services || config
      },
      message: `Retrieved configuration for **${serviceNames.length}** service(s): ${serviceNames.join(', ')}.`
    };
  })
  .build();
