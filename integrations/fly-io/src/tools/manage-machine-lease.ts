import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageMachineLease = SlateTool.create(spec, {
  name: 'Manage Machine Lease',
  key: 'manage_machine_lease',
  description: `Acquire, check, or release an exclusive modification lease on a Fly Machine. Leases prevent concurrent updates to the same machine. Use "acquire" before updating, and "release" when done.`,
  instructions: [
    'Use "acquire" to get an exclusive lease nonce — required for safe updates.',
    'Use "get" to check the current lease status.',
    'Use "release" to free the lease, passing the nonce received from acquire.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      machineId: z.string().describe('ID of the machine'),
      action: z.enum(['acquire', 'get', 'release']).describe('Lease action to perform'),
      ttl: z.number().optional().describe('Lease duration in seconds (only for acquire)'),
      leaseDescription: z
        .string()
        .optional()
        .describe('Optional label for the lease (only for acquire)'),
      nonce: z.string().optional().describe('Lease nonce (required for release)')
    })
  )
  .output(
    z.object({
      nonce: z.string().optional().describe('Lease nonce (returned for acquire and get)'),
      expiresAt: z.number().optional().describe('Lease expiration timestamp'),
      version: z.string().optional().describe('Machine version at time of lease'),
      released: z
        .boolean()
        .optional()
        .describe('Whether the lease was released (for release action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { appName, machineId, action } = ctx.input;

    if (action === 'acquire') {
      let lease = await client.createLease(appName, machineId, {
        ttl: ctx.input.ttl,
        description: ctx.input.leaseDescription
      });
      return {
        output: {
          nonce: lease.nonce,
          expiresAt: lease.expiresAt,
          version: lease.version
        },
        message: `Acquired lease on machine **${machineId}** with nonce **${lease.nonce}**.`
      };
    }

    if (action === 'get') {
      let lease = await client.getLease(appName, machineId);
      if (!lease) {
        return {
          output: {},
          message: `No active lease on machine **${machineId}**.`
        };
      }
      return {
        output: {
          nonce: lease.nonce,
          expiresAt: lease.expiresAt,
          version: lease.version
        },
        message: `Machine **${machineId}** has an active lease with nonce **${lease.nonce}**.`
      };
    }

    // release
    if (!ctx.input.nonce) {
      throw new Error('Nonce is required to release a lease');
    }
    await client.releaseLease(appName, machineId, ctx.input.nonce);
    return {
      output: { released: true },
      message: `Released lease on machine **${machineId}**.`
    };
  })
  .build();
