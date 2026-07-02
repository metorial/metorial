import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageConcurrency = SlateTool.create(spec, {
  name: 'Manage Concurrency',
  key: 'manage_concurrency',
  description: `Configure reserved and provisioned concurrency for a Lambda function. **Reserved concurrency** guarantees a set amount of concurrent executions. **Provisioned concurrency** keeps execution environments warm to eliminate cold starts.`,
  instructions: [
    'Use concurrencyType "reserved" to manage reserved concurrency, or "provisioned" for provisioned concurrency.',
    'For provisioned concurrency, a qualifier (version number or alias) is required.',
    'Use action "get" to check current settings, "set" to configure, or "delete" to remove.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'set', 'delete']).describe('Operation to perform'),
      functionName: z.string().describe('Function name or ARN'),
      concurrencyType: z
        .enum(['reserved', 'provisioned'])
        .describe('Type of concurrency to manage'),
      concurrentExecutions: z
        .number()
        .optional()
        .describe('Number of concurrent executions to reserve/provision'),
      qualifier: z
        .string()
        .optional()
        .describe('Version or alias (required for provisioned concurrency)')
    })
  )
  .output(
    z.object({
      reservedConcurrentExecutions: z
        .number()
        .optional()
        .describe('Reserved concurrent executions'),
      provisionedConcurrentExecutions: z
        .number()
        .optional()
        .describe('Provisioned concurrent executions'),
      allocatedProvisionedConcurrency: z
        .number()
        .optional()
        .describe('Actually allocated provisioned concurrency'),
      availableProvisionedConcurrency: z
        .number()
        .optional()
        .describe('Available provisioned concurrency'),
      status: z.string().optional().describe('Provisioned concurrency status'),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, functionName, concurrencyType } = ctx.input;

    if (concurrencyType === 'reserved') {
      if (action === 'get') {
        let result = await client.getFunctionConcurrency(functionName);
        return {
          output: { reservedConcurrentExecutions: result.ReservedConcurrentExecutions },
          message:
            result.ReservedConcurrentExecutions !== undefined
              ? `Reserved concurrency for **${functionName}**: **${result.ReservedConcurrentExecutions}**.`
              : `No reserved concurrency configured for **${functionName}**.`
        };
      }
      if (action === 'delete') {
        await client.deleteFunctionConcurrency(functionName);
        return {
          output: { deleted: true },
          message: `Removed reserved concurrency from **${functionName}**.`
        };
      }
      if (!ctx.input.concurrentExecutions && ctx.input.concurrentExecutions !== 0) {
        throw lambdaServiceError(
          'concurrentExecutions is required to set reserved concurrency'
        );
      }
      let result = await client.putFunctionConcurrency(
        functionName,
        ctx.input.concurrentExecutions
      );
      return {
        output: { reservedConcurrentExecutions: result.ReservedConcurrentExecutions },
        message: `Set reserved concurrency for **${functionName}** to **${result.ReservedConcurrentExecutions}**.`
      };
    }

    // provisioned
    if (!ctx.input.qualifier)
      throw lambdaServiceError('qualifier is required for provisioned concurrency');

    if (action === 'get') {
      let result = await client.getProvisionedConcurrencyConfig(
        functionName,
        ctx.input.qualifier
      );
      return {
        output: {
          provisionedConcurrentExecutions: result.RequestedProvisionedConcurrentExecutions,
          allocatedProvisionedConcurrency: result.AllocatedProvisionedConcurrentExecutions,
          availableProvisionedConcurrency: result.AvailableProvisionedConcurrentExecutions,
          status: result.Status
        },
        message: `Provisioned concurrency for **${functionName}:${ctx.input.qualifier}**: requested=${result.RequestedProvisionedConcurrentExecutions}, status=${result.Status}.`
      };
    }

    if (action === 'delete') {
      await client.deleteProvisionedConcurrencyConfig(functionName, ctx.input.qualifier);
      return {
        output: { deleted: true },
        message: `Removed provisioned concurrency from **${functionName}:${ctx.input.qualifier}**.`
      };
    }

    if (!ctx.input.concurrentExecutions) {
      throw lambdaServiceError(
        'concurrentExecutions is required to set provisioned concurrency'
      );
    }
    let result = await client.putProvisionedConcurrencyConfig(
      functionName,
      ctx.input.qualifier,
      ctx.input.concurrentExecutions
    );
    return {
      output: {
        provisionedConcurrentExecutions: result.RequestedProvisionedConcurrentExecutions,
        allocatedProvisionedConcurrency: result.AllocatedProvisionedConcurrentExecutions,
        availableProvisionedConcurrency: result.AvailableProvisionedConcurrentExecutions,
        status: result.Status
      },
      message: `Set provisioned concurrency for **${functionName}:${ctx.input.qualifier}** to **${ctx.input.concurrentExecutions}** (status: ${result.Status}).`
    };
  })
  .build();
