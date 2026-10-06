import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext, type DatabaseConfiguration } from '../lib/client';
import { spec } from '../spec';

export let updateDatabaseConfiguration = SlateTool.create(spec, {
  tags: { readOnly: false },
  name: 'Update Database Configuration',
  key: 'update_database_configuration',
  description: `Choose an organization with list_organizations. Update a database's configuration. Configure size limits, read/write blocking, delete protection, IP/VPC access rules and legacy ATTACH permission.`
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      databaseName: z.string().describe('Name of the database to configure'),
      sizeLimit: z
        .string()
        .optional()
        .describe('Maximum database size (e.g., "256mb", "1gb")'),
      allowAttach: z
        .boolean()
        .optional()
        .describe(
          'Whether to allow ATTACH operations; limited to eligible existing paid accounts'
        ),
      blockReads: z.boolean().optional().describe('Whether to block read operations'),
      blockWrites: z.boolean().optional().describe('Whether to block write operations'),
      deleteProtection: z
        .boolean()
        .optional()
        .describe('Prevent database deletion when true.'),
      allowedIps: z
        .array(z.string())
        .optional()
        .describe(
          'Allowed IP addresses/CIDR blocks. Empty array clears restrictions; omit to leave unchanged.'
        ),
      allowedAwsVpcIds: z
        .array(z.string())
        .optional()
        .describe(
          'Allowed AWS VPC endpoint IDs. Empty array clears restrictions; omit to leave unchanged.'
        )
    })
  )
  .output(
    z.object({
      sizeLimit: z.string().optional().describe('Updated size limit'),
      allowAttach: z.boolean().optional().describe('Updated ATTACH permission'),
      blockReads: z.boolean().optional().describe('Updated read block status'),
      blockWrites: z.boolean().optional().describe('Updated write block status'),
      deleteProtection: z.boolean().optional(),
      allowedIps: z.array(z.string()).optional(),
      allowedAwsVpcIds: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let config: DatabaseConfiguration = {};
    if (ctx.input.sizeLimit !== undefined) config.size_limit = ctx.input.sizeLimit;
    if (ctx.input.allowAttach !== undefined) config.allow_attach = ctx.input.allowAttach;
    if (ctx.input.blockReads !== undefined) config.block_reads = ctx.input.blockReads;
    if (ctx.input.blockWrites !== undefined) config.block_writes = ctx.input.blockWrites;

    if (ctx.input.deleteProtection !== undefined)
      config.delete_protection = ctx.input.deleteProtection;
    if (ctx.input.allowedIps !== undefined) config.allowed_ips = ctx.input.allowedIps;
    if (ctx.input.allowedAwsVpcIds !== undefined)
      config.allowed_aws_vpc_ids = ctx.input.allowedAwsVpcIds;

    let result = await client.updateDatabaseConfiguration(ctx.input.databaseName, config);

    return {
      output: {
        sizeLimit: result.size_limit,
        allowAttach: result.allow_attach,
        blockReads: result.block_reads,
        blockWrites: result.block_writes,
        deleteProtection: result.delete_protection,
        allowedIps: result.allowed_ips,
        allowedAwsVpcIds: result.allowed_aws_vpc_ids
      },
      message: `Updated configuration for database **${ctx.input.databaseName}**.`
    };
  })
  .build();
