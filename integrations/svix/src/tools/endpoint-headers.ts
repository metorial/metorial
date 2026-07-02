import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEndpointHeaders = SlateTool.create(spec, {
  name: 'Get Endpoint Headers',
  key: 'get_endpoint_headers',
  description: `Retrieve the custom HTTP headers configured for a webhook endpoint, including the names of sensitive headers that Svix redacts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID')
    })
  )
  .output(
    z.object({
      headers: z.record(z.string(), z.string()).describe('Configured non-sensitive headers'),
      sensitive: z.array(z.string()).describe('Header names whose values are redacted by Svix')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoint headers...');
    let result = await client.getEndpointHeaders(
      ctx.input.applicationId,
      ctx.input.endpointId
    );

    return {
      output: {
        headers: result.headers || {},
        sensitive: result.sensitive || []
      },
      message: `Fetched custom headers for endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();

export let updateEndpointHeaders = SlateTool.create(spec, {
  name: 'Update Endpoint Headers',
  key: 'update_endpoint_headers',
  description: `Replace the custom HTTP headers sent with webhook deliveries for an endpoint.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID'),
      headers: z
        .record(z.string(), z.string())
        .describe('Complete header map to send with webhook deliveries')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether endpoint headers were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Updating endpoint headers...');
    await client.updateEndpointHeaders(ctx.input.applicationId, ctx.input.endpointId, {
      headers: ctx.input.headers
    });

    return {
      output: {
        updated: true
      },
      message: `Updated custom headers for endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();
