import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEndpointTransformation = SlateTool.create(spec, {
  name: 'Get Endpoint Transformation',
  key: 'get_endpoint_transformation',
  description: `Retrieve the JavaScript transformation configured for an endpoint and whether it is enabled.`,
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
      code: z.string().nullable().optional().describe('Transformation JavaScript code'),
      enabled: z.boolean().describe('Whether the transformation is enabled'),
      updatedAt: z
        .string()
        .nullable()
        .optional()
        .describe('When the transformation was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Fetching endpoint transformation...');
    let transformation = await client.getEndpointTransformation(
      ctx.input.applicationId,
      ctx.input.endpointId
    );

    return {
      output: {
        code: transformation.code,
        enabled: transformation.enabled ?? false,
        updatedAt: transformation.updatedAt
      },
      message: `Endpoint \`${ctx.input.endpointId}\` transformation is ${transformation.enabled ? 'enabled' : 'disabled'}.`
    };
  })
  .build();

export let updateEndpointTransformation = SlateTool.create(spec, {
  name: 'Update Endpoint Transformation',
  key: 'update_endpoint_transformation',
  description: `Set, unset, enable, or disable the JavaScript transformation associated with an endpoint.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('Application ID or UID'),
      endpointId: z.string().describe('Endpoint ID or UID'),
      code: z
        .string()
        .nullable()
        .optional()
        .describe('Transformation JavaScript code, or null to unset it'),
      enabled: z.boolean().optional().describe('Whether the transformation should be enabled')
    })
  )
  .output(
    z.object({
      code: z.string().nullable().optional().describe('Current transformation code'),
      enabled: z.boolean().describe('Whether the transformation is enabled'),
      updatedAt: z
        .string()
        .nullable()
        .optional()
        .describe('When the transformation was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region || 'us'
    });

    ctx.progress('Updating endpoint transformation...');
    await client.patchEndpointTransformation(ctx.input.applicationId, ctx.input.endpointId, {
      code: ctx.input.code,
      enabled: ctx.input.enabled
    });

    let transformation = await client.getEndpointTransformation(
      ctx.input.applicationId,
      ctx.input.endpointId
    );

    return {
      output: {
        code: transformation.code,
        enabled: transformation.enabled ?? false,
        updatedAt: transformation.updatedAt
      },
      message: `Updated transformation for endpoint \`${ctx.input.endpointId}\`.`
    };
  })
  .build();
