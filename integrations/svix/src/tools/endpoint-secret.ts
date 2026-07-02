import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEndpointSecret = SlateTool.create(spec, {
  name: 'Get Endpoint Secret',
  key: 'get_endpoint_secret',
  description: `Retrieve an endpoint's webhook signing secret for signature verification.`,
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
      signingSecret: z.string().describe('Endpoint signing secret')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoint signing secret...');
    let result = await client.getEndpointSecret(ctx.input.applicationId, ctx.input.endpointId);

    return {
      output: {
        signingSecret: result.key
      },
      message: `Fetched signing secret for endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();

export let rotateEndpointSecret = SlateTool.create(spec, {
  name: 'Rotate Endpoint Secret',
  key: 'rotate_endpoint_secret',
  description: `Rotate an endpoint's webhook signing secret. Provide a specific secret or omit it to let Svix generate one.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID'),
      signingSecret: z
        .string()
        .optional()
        .describe('Optional new signing secret, usually prefixed with whsec_')
    })
  )
  .output(
    z.object({
      rotated: z.boolean().describe('Whether the endpoint signing secret was rotated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Rotating endpoint signing secret...');
    await client.rotateEndpointSecret(
      ctx.input.applicationId,
      ctx.input.endpointId,
      ctx.input.signingSecret
    );

    return {
      output: {
        rotated: true
      },
      message: `Rotated signing secret for endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();
