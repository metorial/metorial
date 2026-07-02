import { SlateTool } from 'slates';
import { z } from 'zod';
import { BackendlessClient } from '../lib/client';
import { spec } from '../spec';

export let manageCounter = SlateTool.create(spec, {
  name: 'Manage Counter',
  key: 'manage_counter',
  description: `Manages atomic counters in Backendless. Supports getting the current value, incrementing, decrementing, incrementing by a custom amount, and resetting a counter. Counters are thread-safe and ideal for generating sequential values or tracking counts.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      counterName: z.string().describe('Name of the atomic counter'),
      operation: z
        .enum(['get', 'increment', 'decrement', 'incrementBy', 'reset'])
        .describe('Operation to perform on the counter'),
      incrementValue: z
        .number()
        .optional()
        .describe('Amount to increment by (only used with "incrementBy" operation)')
    })
  )
  .output(
    z.object({
      counterName: z.string().describe('Name of the counter'),
      value: z
        .number()
        .optional()
        .describe('Current value of the counter after the operation'),
      operationPerformed: z.string().describe('Description of the operation performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BackendlessClient({
      applicationId: ctx.auth.applicationId,
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      region: ctx.config.region
    });

    let value: number | undefined;
    let operationPerformed: string;

    switch (ctx.input.operation) {
      case 'get':
        value = await client.getCounterValue(ctx.input.counterName);
        operationPerformed = 'Retrieved current value';
        break;
      case 'increment':
        value = await client.incrementCounter(ctx.input.counterName);
        operationPerformed = 'Incremented by 1';
        break;
      case 'decrement':
        value = await client.decrementCounter(ctx.input.counterName);
        operationPerformed = 'Decremented by 1';
        break;
      case 'incrementBy': {
        let amount = ctx.input.incrementValue ?? 1;
        value = await client.incrementCounterBy(ctx.input.counterName, amount);
        operationPerformed = `Incremented by ${amount}`;
        break;
      }
      case 'reset':
        await client.resetCounter(ctx.input.counterName);
        value = 0;
        operationPerformed = 'Reset to 0';
        break;
    }

    return {
      output: {
        counterName: ctx.input.counterName,
        value,
        operationPerformed
      },
      message: `Counter **${ctx.input.counterName}**: ${operationPerformed}. Current value: **${value}**.`
    };
  })
  .build();
