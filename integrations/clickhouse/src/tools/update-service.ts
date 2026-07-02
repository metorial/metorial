import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { clickhouseServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updateService = SlateTool.create(spec, {
  name: 'Update Service',
  key: 'update_service',
  description: `Update a ClickHouse service's configuration, including its name, IP access list, tags, release channel, and endpoint settings. Use separate tools for scaling and state changes.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to update'),
      name: z.string().optional().describe('New name for the service'),
      ipAccessListAdd: z
        .array(
          z.object({
            source: z.string(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('IP access list entries to add'),
      ipAccessListRemove: z
        .array(
          z.object({
            source: z.string(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('IP access list entries to remove'),
      releaseChannel: z
        .enum(['slow', 'default', 'fast'])
        .optional()
        .describe('Release channel for updates'),
      endpoints: z
        .array(
          z.object({
            protocol: z.enum(['mysql']).describe('Endpoint protocol to change'),
            enabled: z.boolean().describe('Whether this endpoint protocol should be enabled')
          })
        )
        .optional()
        .describe('Service endpoints to enable or disable'),
      privateEndpointIdsAdd: z
        .array(z.string())
        .optional()
        .describe('Private endpoint IDs to attach to the service'),
      privateEndpointIdsRemove: z
        .array(z.string())
        .optional()
        .describe('Private endpoint IDs to detach from the service'),
      tagsAdd: z
        .array(
          z.object({
            key: z.string(),
            value: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Tags to add'),
      tagsRemove: z
        .array(
          z.object({
            key: z.string(),
            value: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Tags to remove'),
      enableCoreDumps: z
        .boolean()
        .optional()
        .describe('Enable or disable underlying infrastructure for collecting core dumps')
    })
  )
  .output(
    z.object({
      serviceId: z.string(),
      name: z.string().optional(),
      state: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};

    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.releaseChannel) body.releaseChannel = ctx.input.releaseChannel;
    if (ctx.input.endpoints) body.endpoints = ctx.input.endpoints;
    if (ctx.input.enableCoreDumps !== undefined) {
      body.enableCoreDumps = ctx.input.enableCoreDumps;
    }

    if (ctx.input.ipAccessListAdd || ctx.input.ipAccessListRemove) {
      body.ipAccessList = {};
      if (ctx.input.ipAccessListAdd) body.ipAccessList.add = ctx.input.ipAccessListAdd;
      if (ctx.input.ipAccessListRemove)
        body.ipAccessList.remove = ctx.input.ipAccessListRemove;
    }

    if (ctx.input.privateEndpointIdsAdd || ctx.input.privateEndpointIdsRemove) {
      body.privateEndpointIds = {};
      if (ctx.input.privateEndpointIdsAdd)
        body.privateEndpointIds.add = ctx.input.privateEndpointIdsAdd;
      if (ctx.input.privateEndpointIdsRemove)
        body.privateEndpointIds.remove = ctx.input.privateEndpointIdsRemove;
    }

    if (ctx.input.tagsAdd || ctx.input.tagsRemove) {
      body.tags = {};
      if (ctx.input.tagsAdd) body.tags.add = ctx.input.tagsAdd;
      if (ctx.input.tagsRemove) body.tags.remove = ctx.input.tagsRemove;
    }

    if (Object.keys(body).length === 0) {
      throw clickhouseServiceError('Provide at least one service field to update.');
    }

    let result = await client.updateService(ctx.input.serviceId, body);

    return {
      output: {
        serviceId: result.id || ctx.input.serviceId,
        name: result.name,
        state: result.state
      },
      message: `Service **${result.name || ctx.input.serviceId}** updated successfully.`
    };
  })
  .build();
