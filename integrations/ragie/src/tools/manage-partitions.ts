import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePartitions = SlateTool.create(spec, {
  name: 'Manage Partitions',
  key: 'manage_partitions',
  description: `List, create, inspect, or delete partitions. Partitions logically separate documents for multi-tenant applications or distinct knowledge bases.
Retrievals can be scoped to a specific partition. Deleting a partition **irreversibly** removes all associated documents, connections, and instructions.`,
  instructions: [
    'Use action "list" to see all partitions.',
    'Use action "create" to create a new partition. Names must be lowercase alphanumeric with underscores and hyphens.',
    'Use action "get" to inspect a partition and see usage metrics.',
    'Use action "delete" to permanently delete a partition and ALL its data.'
  ],
  constraints: [
    'Partition names must be lowercase alphanumeric, underscores, and hyphens only.',
    'Deleting a partition is irreversible and removes all associated data.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'delete']).describe('Action to perform'),
      partitionId: z
        .string()
        .optional()
        .describe('Partition ID (required for get and delete)'),
      name: z
        .string()
        .optional()
        .describe(
          'Partition name (required for create). Lowercase alphanumeric, underscores, hyphens.'
        )
    })
  )
  .output(
    z.object({
      partitions: z
        .array(
          z.object({
            partitionId: z.string().describe('Partition ID'),
            name: z.string().describe('Partition name'),
            documentCount: z.number().describe('Number of documents'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .optional()
        .describe('List of partitions'),
      partition: z
        .record(z.string(), z.any())
        .optional()
        .describe('Partition details with usage metrics'),
      deleted: z.boolean().optional().describe('Whether the partition was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      partition: ctx.config.partition
    });

    switch (ctx.input.action) {
      case 'list': {
        let partitions = await client.listPartitions();
        return {
          output: {
            partitions: partitions.map(p => ({
              partitionId: p.id,
              name: p.name,
              documentCount: p.documentCount,
              createdAt: p.createdAt,
              updatedAt: p.updatedAt
            }))
          },
          message: `Found **${partitions.length}** partitions.`
        };
      }

      case 'create': {
        if (!ctx.input.name) throw new Error('name is required for creating a partition.');
        let partition = await client.createPartition({ name: ctx.input.name });
        return {
          output: {
            partition: {
              partitionId: partition.id,
              name: partition.name,
              documentCount: partition.documentCount,
              createdAt: partition.createdAt,
              updatedAt: partition.updatedAt
            }
          },
          message: `Partition **${partition.name}** created. ID: \`${partition.id}\``
        };
      }

      case 'get': {
        if (!ctx.input.partitionId) throw new Error('partitionId is required.');
        let partition = await client.getPartition(ctx.input.partitionId);
        return {
          output: {
            partition
          },
          message: `Partition \`${ctx.input.partitionId}\`: ${JSON.stringify(partition)}`
        };
      }

      case 'delete': {
        if (!ctx.input.partitionId) throw new Error('partitionId is required.');
        await client.deletePartition(ctx.input.partitionId);
        return {
          output: {
            deleted: true
          },
          message: `Partition \`${ctx.input.partitionId}\` deleted. All associated data has been permanently removed.`
        };
      }
    }
  })
  .build();
