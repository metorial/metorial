import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let createByocInfrastructure = SlateTool.create(spec, {
  name: 'Create BYOC Infrastructure',
  key: 'create_byoc_infrastructure',
  description: `Create new Bring Your Own Cloud (BYOC) infrastructure in the organization. BYOC lets you deploy ClickHouse services in your own cloud account.`
})
  .input(
    z.object({
      regionId: z
        .string()
        .describe('Cloud region ID (e.g., us-east-1, europe-west4, centralus)'),
      accountId: z.string().describe('Your cloud provider account ID'),
      displayName: z.string().describe('Display name for this BYOC infrastructure'),
      vpcCidrRange: z.string().optional().describe('VPC CIDR range for the infrastructure'),
      availabilityZoneSuffixes: z
        .array(z.string())
        .optional()
        .describe('Availability zone suffixes (e.g., ["a", "b", "c"])')
    })
  )
  .output(
    z.object({
      byocId: z.string(),
      state: z.string().optional(),
      accountName: z.string().optional(),
      regionId: z.string().optional(),
      cloudProvider: z.string().optional(),
      displayName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      regionId: ctx.input.regionId,
      accountId: ctx.input.accountId,
      displayName: ctx.input.displayName
    };
    if (ctx.input.vpcCidrRange) body.vpcCidrRange = ctx.input.vpcCidrRange;
    if (ctx.input.availabilityZoneSuffixes)
      body.availabilityZoneSuffixes = ctx.input.availabilityZoneSuffixes;

    let result = await client.createByocInfrastructure(body);

    return {
      output: {
        byocId: result.id,
        state: result.state,
        accountName: result.accountName,
        regionId: result.regionId,
        cloudProvider: result.cloudProvider,
        displayName: result.displayName
      },
      message: `BYOC infrastructure **${result.displayName}** created in ${result.regionId} (${result.cloudProvider}).`
    };
  })
  .build();

export let updateByocInfrastructure = SlateTool.create(spec, {
  name: 'Update BYOC Infrastructure',
  key: 'update_byoc_infrastructure',
  description: `Update an existing BYOC infrastructure configuration, such as its display name.`
})
  .input(
    z.object({
      byocId: z.string().describe('ID of the BYOC infrastructure to update'),
      displayName: z.string().optional().describe('New display name')
    })
  )
  .output(
    z.object({
      byocId: z.string(),
      displayName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {};
    if (ctx.input.displayName) body.displayName = ctx.input.displayName;

    let result = await client.updateByocInfrastructure(ctx.input.byocId, body);

    return {
      output: {
        byocId: result.id || ctx.input.byocId,
        displayName: result.displayName
      },
      message: `BYOC infrastructure **${ctx.input.byocId}** updated.`
    };
  })
  .build();

export let deleteByocInfrastructure = SlateTool.create(spec, {
  name: 'Delete BYOC Infrastructure',
  key: 'delete_byoc_infrastructure',
  description: `Delete a BYOC infrastructure from the organization.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      byocId: z.string().describe('ID of the BYOC infrastructure to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteByocInfrastructure(ctx.input.byocId);

    return {
      output: { deleted: true },
      message: `BYOC infrastructure **${ctx.input.byocId}** deleted.`
    };
  })
  .build();
