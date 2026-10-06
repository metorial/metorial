import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { databaseIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getDatabaseUsage = SlateTool.create(spec, {
  name: 'Get Database Usage',
  key: 'get_database_usage',
  description: `Retrieve Prisma Postgres operation and storage usage for a date range. Legacy query-count and egress fields remain absent when the provider does not report them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: databaseIdInput,
      startDate: z
        .string()
        .optional()
        .describe('ISO 8601 start timestamp. Defaults to the start of the current month.'),
      endDate: z
        .string()
        .optional()
        .describe(
          'ISO 8601 end timestamp. Defaults to the current date; future dates are capped by the provider.'
        )
    })
  )
  .output(
    z.object({
      databaseId: z.string().optional().describe('Database ID'),
      period: z.string().optional().describe('Usage period'),
      queries: z.number().optional().describe('Number of queries executed'),
      storage: z.number().optional().describe('Storage used in bytes'),
      egress: z.number().optional().describe('Data egress in bytes'),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
      operations: z.number().optional(),
      storageGiB: z.number().optional(),
      generatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let usage = await client.getDatabaseUsage(ctx.input.databaseId, ctx.input);

    return {
      output: {
        databaseId: ctx.input.databaseId,
        period: `${usage.period.start}/${usage.period.end}`,
        periodStart: usage.period.start,
        periodEnd: usage.period.end,
        operations: usage.metrics.operations.used,
        storageGiB:
          usage.metrics.storage.unit === 'GiB' ? usage.metrics.storage.used : undefined,
        storage:
          usage.metrics.storage.unit === 'GiB'
            ? usage.metrics.storage.used * 2 ** 30
            : undefined,
        generatedAt: usage.generatedAt
      },
      message: `Usage for database **${ctx.input.databaseId}**: ${usage.metrics.operations.used} operations and ${usage.metrics.storage.used} ${usage.metrics.storage.unit} storage.`
    };
  })
  .build();
