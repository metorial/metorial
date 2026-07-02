import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let getDatabaseUsage = SlateTool.create(spec, {
  name: 'Get Database Usage',
  key: 'get_database_usage',
  description: `Retrieve usage statistics for a Prisma Postgres database including query counts, storage consumption, and egress metrics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to retrieve usage for')
    })
  )
  .output(
    z.object({
      databaseId: z.string().optional().describe('Database ID'),
      period: z.string().optional().describe('Usage period'),
      queries: z.number().optional().describe('Number of queries executed'),
      storage: z.number().optional().describe('Storage used in bytes'),
      egress: z.number().optional().describe('Data egress in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let usage = await client.getDatabaseUsage(ctx.input.databaseId);

    return {
      output: {
        databaseId: usage.databaseId ?? ctx.input.databaseId,
        period: usage.period as string | undefined,
        queries: usage.queries as number | undefined,
        storage: usage.storage as number | undefined,
        egress: usage.egress as number | undefined
      },
      message: `Usage for database **${ctx.input.databaseId}**: ${usage.queries ?? 'N/A'} queries, ${usage.storage ?? 'N/A'} storage, ${usage.egress ?? 'N/A'} egress.`
    };
  })
  .build();
