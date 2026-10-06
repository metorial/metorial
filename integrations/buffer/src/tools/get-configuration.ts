import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConfigurationTool = SlateTool.create(spec, {
  name: 'Get Service Configuration',
  key: 'get_configuration',
  description: `Read the current experimental service capability catalog for an organization, grouped by service and channel type. Includes supported content types and properties. Legacy connections retain the older configuration response when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe(
          'Current API organization ID. Required when more than one organization is accessible; discover it with Get Organizations.'
        )
    })
  )
  .output(
    z.object({
      services: z
        .record(z.string(), z.unknown())
        .describe(
          'Actual provider service configuration; current API returns types with content capabilities, legacy API may include limits and URLs'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let config = await client.getConfiguration(ctx.input.organizationId);

    let serviceNames = Object.keys(config.services);

    return {
      output: {
        services: config.services
      },
      message: `Retrieved configuration for **${serviceNames.length}** service(s): ${serviceNames.join(', ')}.`
    };
  })
  .build();
