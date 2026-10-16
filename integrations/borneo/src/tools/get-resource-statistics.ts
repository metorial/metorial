import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getResourceStatistics = SlateTool.create(spec, {
  name: 'Get Resource Statistics',
  key: 'get_resource_statistics',
  description: `Retrieve data-resource size, entity count, and measurement units for the connected Borneo organisation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.')
    })
  )
  .output(
    z
      .object({
        statistics: z.any().describe('Resource statistics overview')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let result = await client.getResourceStatistics();
    let data = result;

    return {
      output: { statistics: data },
      message: `Retrieved resource statistics.`
    };
  })
  .build();
