import { SlateTool } from 'slates';
import { z } from 'zod';
import { SesClient } from '../lib/client';
import { requireAwsSesString } from '../lib/errors';
import { spec } from '../spec';

export let manageDedicatedIpPool = SlateTool.create(spec, {
  name: 'Manage Dedicated IP Pool',
  key: 'manage_dedicated_ip_pool',
  description: `Create, retrieve, delete, or list dedicated IP pools in SES. Dedicated IP pools group IPs for isolated sender reputation management. Pools can operate in **Standard** (manually managed) or **Managed** (AWS handles warmup and optimization) mode.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete', 'list']).describe('Operation to perform'),
      poolName: z
        .string()
        .optional()
        .describe('IP pool name (required for all except "list")'),
      scalingMode: z
        .enum(['STANDARD', 'MANAGED'])
        .optional()
        .describe('Scaling mode (for "create")'),
      nextToken: z.string().optional().describe('Pagination token for "list"'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      poolName: z.string().optional(),
      scalingMode: z.string().optional(),
      dedicatedIpPools: z.array(z.string()).optional().describe('List of pool names'),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SesClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let poolName = requireAwsSesString(ctx.input.poolName, 'poolName', action);
      await client.createDedicatedIpPool({
        poolName,
        scalingMode: ctx.input.scalingMode
      });
      return {
        output: { poolName, scalingMode: ctx.input.scalingMode },
        message: `Dedicated IP pool **${poolName}** created${ctx.input.scalingMode ? ` (mode: ${ctx.input.scalingMode})` : ''}.`
      };
    }

    if (action === 'get') {
      let poolName = requireAwsSesString(ctx.input.poolName, 'poolName', action);
      let result = await client.getDedicatedIpPool(poolName);
      return {
        output: result,
        message: `Pool **${result.poolName}**: scaling mode = ${result.scalingMode}.`
      };
    }

    if (action === 'delete') {
      let poolName = requireAwsSesString(ctx.input.poolName, 'poolName', action);
      await client.deleteDedicatedIpPool(poolName);
      return {
        output: { poolName },
        message: `Dedicated IP pool **${poolName}** deleted.`
      };
    }

    if (action === 'list') {
      let result = await client.listDedicatedIpPools({
        nextToken: ctx.input.nextToken,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          dedicatedIpPools: result.dedicatedIpPools,
          nextToken: result.nextToken
        },
        message: `Found **${result.dedicatedIpPools.length}** dedicated IP pool(s).${result.nextToken ? ' More results available.' : ''}`
      };
    }

    return { output: {}, message: 'No action performed.' };
  })
  .build();
