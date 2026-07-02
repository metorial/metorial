import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getResourceStatistics = SlateTool.create(spec, {
  name: 'Get Resource Statistics',
  key: 'get_resource_statistics',
  description: `Retrieve comprehensive statistics about data resources across the platform. Provides an overview of the data security posture including resource counts and classification metrics.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
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
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getResourceStatistics();
    let data = result?.data ?? result;

    return {
      output: { statistics: data },
      message: `Retrieved resource statistics.`
    };
  })
  .build();
