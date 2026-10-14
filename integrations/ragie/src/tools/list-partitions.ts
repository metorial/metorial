import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPartitions = SlateTool.create(spec, {
  name: 'List Partitions',
  key: 'list_partitions',
  description:
    'Browse partitions in name order with pagination. Returns the partition identifier, description, default status, context settings, metadata schema, and usage limits. Pass a partition identifier to document tools or manage_partitions with action "get" for usage metrics.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Cursor from the previous partition page'),
      pageSize: z
        .number()
        .optional()
        .describe('Partitions per page, a whole number from 1 to 100')
    })
  )
  .output(
    z.object({
      partitions: z.array(
        z.object({
          partitionId: z
            .string()
            .describe(
              'Partition name used as the identifier in document and partition operations'
            ),
          name: z.string(),
          description: z.string().nullable(),
          isDefault: z.boolean(),
          contextAware: z.boolean(),
          metadataSchema: z.record(z.string(), z.any()).nullable(),
          limits: z.record(z.string(), z.any())
        })
      ),
      nextCursor: z.string().nullable(),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, partition: ctx.config.partition });
    let result = await client.listPartitions(ctx.input);
    return {
      output: {
        partitions: result.partitions.map(partition => ({
          partitionId: partition.id ?? partition.name,
          name: partition.name,
          description: partition.description,
          isDefault: partition.is_default,
          contextAware: partition.context_aware,
          metadataSchema: partition.metadata_schema,
          limits: partition.limits
        })),
        nextCursor: result.pagination.nextCursor,
        totalCount: result.pagination.totalCount
      },
      message: `Returned **${result.partitions.length}** partitions.${result.pagination.nextCursor ? ' More pages available.' : ''}`
    };
  })
  .build();
