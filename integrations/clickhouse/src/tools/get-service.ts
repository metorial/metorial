import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let getService = SlateTool.create(spec, {
  name: 'Get Service',
  key: 'get_service',
  description: `Retrieve detailed information about a specific ClickHouse service, including its state, scaling configuration, endpoints, IP access list, tags, and encryption settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to retrieve')
    })
  )
  .output(
    z.object({
      serviceId: z.string(),
      name: z.string(),
      provider: z.string().optional(),
      region: z.string().optional(),
      state: z.string().optional(),
      clickhouseVersion: z.string().optional(),
      numReplicas: z.number().optional(),
      minReplicaMemoryGb: z.number().optional(),
      maxReplicaMemoryGb: z.number().optional(),
      idleScaling: z.boolean().optional(),
      idleTimeoutMinutes: z.number().optional(),
      endpoints: z
        .array(
          z.object({
            protocol: z.string().optional(),
            host: z.string().optional(),
            port: z.number().optional()
          })
        )
        .optional(),
      ipAccessList: z
        .array(
          z.object({
            source: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional(),
      createdAt: z.string().optional(),
      isReadonly: z.boolean().optional(),
      isPrimary: z.boolean().optional(),
      releaseChannel: z.string().optional(),
      dataWarehouseId: z.string().optional(),
      byocId: z.string().optional(),
      tags: z
        .array(
          z.object({
            key: z.string(),
            value: z.string().nullable().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let s = await client.getService(ctx.input.serviceId);

    return {
      output: {
        serviceId: s.id,
        name: s.name,
        provider: s.provider,
        region: s.region,
        state: s.state,
        clickhouseVersion: s.clickhouseVersion,
        numReplicas: s.numReplicas,
        minReplicaMemoryGb: s.minReplicaMemoryGb,
        maxReplicaMemoryGb: s.maxReplicaMemoryGb,
        idleScaling: s.idleScaling,
        idleTimeoutMinutes: s.idleTimeoutMinutes,
        endpoints: s.endpoints,
        ipAccessList: s.ipAccessList,
        createdAt: s.createdAt,
        isReadonly: s.isReadonly,
        isPrimary: s.isPrimary,
        releaseChannel: s.releaseChannel,
        dataWarehouseId: s.dataWarehouseId,
        byocId: s.byocId,
        tags: s.tags
      },
      message: `Service **${s.name}** is **${s.state}** on ${s.provider}/${s.region} with ${s.numReplicas} replica(s).`
    };
  })
  .build();
