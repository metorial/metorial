import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLease = SlateTool.create(spec, {
  name: 'Manage Lease',
  key: 'manage_lease',
  description: `Acquire, renew, release, or break a lease on a blob or container. Leases provide distributed lock functionality to prevent concurrent modifications. A lease can be finite (15-60 seconds) or infinite (-1).`,
  instructions: [
    'To lease a container, provide containerName and omit blobName.',
    'To lease a blob, provide both containerName and blobName.',
    'Renew and release require the leaseId from a previous acquire.'
  ]
})
  .input(
    z.object({
      containerName: z.string().describe('Name of the container'),
      blobName: z
        .string()
        .optional()
        .describe('Name of the blob (omit to lease the container)'),
      action: z
        .enum(['acquire', 'renew', 'release', 'break'])
        .describe('Lease action to perform'),
      leaseId: z
        .string()
        .optional()
        .describe('Existing lease ID (required for renew and release)'),
      durationSeconds: z
        .number()
        .optional()
        .describe('Lease duration in seconds (15-60, or -1 for infinite). Only for acquire.'),
      breakPeriod: z
        .number()
        .optional()
        .describe('Seconds before a break takes effect (0-60). Only for break.')
    })
  )
  .output(
    z.object({
      containerName: z.string().describe('Container name'),
      blobName: z.string().optional().describe('Blob name if leasing a blob'),
      action: z.string().describe('Action that was performed'),
      leaseId: z.string().optional().describe('Lease ID (returned for acquire and renew)'),
      leaseTime: z
        .number()
        .optional()
        .describe('Remaining lease time in seconds (returned for break)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      accountName: ctx.config.storageAccountName,
      token: ctx.auth.token
    });

    let leaseId: string | undefined;
    let leaseTime: number | undefined;

    switch (ctx.input.action) {
      case 'acquire': {
        let result = await client.acquireLease(
          ctx.input.containerName,
          ctx.input.blobName,
          ctx.input.durationSeconds
        );
        leaseId = result.leaseId;
        break;
      }
      case 'renew': {
        if (!ctx.input.leaseId) throw new Error('leaseId is required for renew');
        let result = await client.renewLease(
          ctx.input.containerName,
          ctx.input.leaseId,
          ctx.input.blobName
        );
        leaseId = result.leaseId;
        break;
      }
      case 'release': {
        if (!ctx.input.leaseId) throw new Error('leaseId is required for release');
        await client.releaseLease(
          ctx.input.containerName,
          ctx.input.leaseId,
          ctx.input.blobName
        );
        break;
      }
      case 'break': {
        let result = await client.breakLease(
          ctx.input.containerName,
          ctx.input.blobName,
          ctx.input.breakPeriod
        );
        leaseTime = result.leaseTime;
        break;
      }
    }

    let target = ctx.input.blobName
      ? `blob **${ctx.input.blobName}** in container **${ctx.input.containerName}**`
      : `container **${ctx.input.containerName}**`;

    return {
      output: {
        containerName: ctx.input.containerName,
        blobName: ctx.input.blobName,
        action: ctx.input.action,
        leaseId,
        leaseTime
      },
      message: `Lease ${ctx.input.action} performed on ${target}${leaseId ? ` (lease ID: ${leaseId})` : ''}.`
    };
  })
  .build();
