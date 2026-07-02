import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { spec } from '../spec';

export let getDatabaseBackups = SlateTool.create(spec, {
  name: 'Get Database Backups',
  key: 'get_database_backups',
  description: `Retrieve backup information for a Prisma Postgres database. Lists all available backups with their status and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z.string().describe('ID of the database to retrieve backups for')
    })
  )
  .output(
    z.object({
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
    let backups = await client.listBackups(ctx.input.databaseId);

    let mapped = backups.map(b => ({
      backupId: b.id,
      createdAt: b.createdAt,
      status: b.status,
      size: b.size
    }));

    return {
      output: { backups: mapped },
      message: `Found **${mapped.length}** backup(s) for database **${ctx.input.databaseId}**.`
    };
  })
  .build();
