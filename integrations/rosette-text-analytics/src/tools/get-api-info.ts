import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getApiInfoTool = SlateTool.create(spec, {
  name: 'Get API Information',
  key: 'get_api_info',
  description:
    'Returns the Analytics API service name, version, and build information for the connected cloud or on-premise installation.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().optional().describe('API service name'),
      version: z.string().optional().describe('API service version'),
      buildNumber: z.string().optional().describe('Service build number'),
      buildTime: z.string().optional().describe('Service build time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.info();
    return {
      output: {
        name: result.name ?? undefined,
        version: result.version ?? undefined,
        buildNumber: result.buildNumber ?? undefined,
        buildTime: result.buildTime ?? undefined
      },
      message: 'Retrieved Analytics API service information.'
    };
  })
  .build();
