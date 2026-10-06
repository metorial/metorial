import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { databaseIdInput } from '../lib/schemas';
import { spec } from '../spec';

export let getDatabaseBackups = SlateTool.create(spec, {
  name: 'Get Database Backups',
  key: 'get_database_backups',
  description: `Retrieve recent backup metadata for a Prisma Postgres database, including retention and whether more backups exist. The API does not expose a continuation cursor for this endpoint.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: databaseIdInput,
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum recent backups to return, from 1 to 100. The provider does not expose a continuation cursor for backups.'
        )
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().optional(),
      limit: z.number().nullable().optional(),
      backupRetentionDays: z.number().optional(),
      backups: z
        .array(
          z.object({
            backupId: z.string().describe('Unique backup identifier'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp of when the backup was created'),
            status: z
              .string()
              .optional()
              .describe('Backup status (e.g., "completed", "in_progress")'),
            size: z.number().optional().describe('Backup size in bytes')
          })
        )
        .describe('List of backups for the database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PrismaClient(ctx.auth.token);
    let backups = await client.listBackups(ctx.input.databaseId, ctx.input.limit);

    let mapped = backups.data.map(b => ({
      backupId: b.id,
      createdAt: b.createdAt,
      status: b.status,
      size: b.size
    }));

    return {
      output: {
        backups: mapped,
        hasMore: backups.pagination.hasMore,
        limit: backups.pagination.limit,
        backupRetentionDays: backups.meta.backupRetentionDays
      },
      message: `Found **${mapped.length}** backup(s) for database **${ctx.input.databaseId}**.`
    };
  })
  .build();
