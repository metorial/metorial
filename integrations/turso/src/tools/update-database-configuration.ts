import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDatabaseConfiguration = SlateTool.create(spec, {
  name: 'Update Database Configuration',
  key: 'update_database_configuration',
  description: `Update a database's configuration. Allows toggling read/write blocking, ATTACH permission, and setting size limits.`
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to configure'),
      sizeLimit: z
        .string()
        .optional()
        .describe('Maximum database size (e.g., "256mb", "1gb")'),
      allowAttach: z.boolean().optional().describe('Whether to allow ATTACH operations'),
      blockReads: z.boolean().optional().describe('Whether to block read operations'),
      blockWrites: z.boolean().optional().describe('Whether to block write operations')
    })
  )
  .output(
    z.object({
      sizeLimit: z.string().optional().describe('Updated size limit'),
      allowAttach: z.boolean().optional().describe('Updated ATTACH permission'),
      blockReads: z.boolean().optional().describe('Updated read block status'),
      blockWrites: z.boolean().optional().describe('Updated write block status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let config: Record<string, unknown> = {};
    if (ctx.input.sizeLimit !== undefined) config.size_limit = ctx.input.sizeLimit;
    if (ctx.input.allowAttach !== undefined) config.allow_attach = ctx.input.allowAttach;
    if (ctx.input.blockReads !== undefined) config.block_reads = ctx.input.blockReads;
    if (ctx.input.blockWrites !== undefined) config.block_writes = ctx.input.blockWrites;

    let result = await client.updateDatabaseConfiguration(ctx.input.databaseName, config);

    return {
      output: {
        sizeLimit: result.size_limit,
        allowAttach: result.allow_attach,
        blockReads: result.block_reads,
        blockWrites: result.block_writes
      },
      message: `Updated configuration for database **${ctx.input.databaseName}**.`
    };
  })
  .build();
