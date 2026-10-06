import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

const outputSchema = z.object({
  databaseName: z.string().describe('Name of the database'),
  databaseId: z.string().describe('Unique identifier of the database'),
  hostname: z.string().describe('Hostname for connecting to the database'),
  regions: z.array(z.string()).optional().describe('Regions where the database is replicated'),
  primaryRegion: z.string().optional().describe('Primary region of the database'),
  group: z.string().optional().describe('Group the database belongs to'),
  type: z.string().optional().describe('Type of the database'),
  isSchema: z.boolean().optional().describe('Whether the database is a schema database'),
  schema: z.string().optional().describe('Parent schema database name, if applicable'),
  sleeping: z.boolean().optional().describe('Whether the database is currently sleeping'),
  blockReads: z.boolean().optional().describe('Whether reads are blocked'),
  blockWrites: z.boolean().optional().describe('Whether writes are blocked'),
  allowAttach: z.boolean().optional().describe('Whether ATTACH is allowed'),
  version: z.string().optional().describe('Database version'),
  configuration: z
    .object({
      sizeLimit: z.string().optional(),
      allowAttach: z.boolean().optional(),
      blockReads: z.boolean().optional(),
      blockWrites: z.boolean().optional(),
      deleteProtection: z.boolean().optional(),
      allowedIps: z.array(z.string()).optional(),
      allowedAwsVpcIds: z.array(z.string()).optional()
    })
    .optional()
    .describe('Database configuration'),
  usage: z
    .object({
      uuid: z.string(),
      instances: z.array(
        z.object({
          uuid: z.string(),
          rowsRead: z.number(),
          rowsWritten: z.number(),
          storageBytes: z.number()
        })
      )
    })
    .optional()
    .describe('Usage statistics'),
  topQueries: z
    .array(
      z.object({
        query: z.string(),
        rowsRead: z.number(),
        rowsWritten: z.number()
      })
    )
    .optional()
    .describe('Top queries by usage'),
  instances: z
    .array(
      z.object({
        instanceUuid: z.string(),
        instanceName: z.string(),
        type: z.string(),
        region: z.string(),
        hostname: z.string()
      })
    )
    .optional()
    .describe('Database instances')
});

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Choose an organization with list_organizations. Retrieve detailed information about a specific database, including its configuration, instances, usage statistics, and top queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      databaseName: z.string().describe('Name of the database to retrieve'),
      includeUsage: z.boolean().optional().describe('Whether to include usage statistics'),
      includeStats: z.boolean().optional().describe('Whether to include top query statistics'),
      includeInstances: z.boolean().optional().describe('Whether to include instance details'),
      includeConfiguration: z
        .boolean()
        .optional()
        .describe('Whether to include database configuration')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.getDatabase(ctx.input.databaseName);
    let db = result.database;

    let output: z.infer<typeof outputSchema> = {
      databaseName: db.Name,
      databaseId: db.DbId,
      hostname: db.Hostname,
      regions: db.regions,
      primaryRegion: db.primaryRegion,
      group: db.group,
      type: db.type,
      isSchema: db.is_schema,
      schema: db.schema,
      sleeping: db.sleeping,
      blockReads: db.block_reads,
      blockWrites: db.block_writes,
      allowAttach: db.allow_attach,
      version: db.version
    };

    if (ctx.input.includeConfiguration) {
      let config = await client.getDatabaseConfiguration(ctx.input.databaseName);
      output.configuration = {
        sizeLimit: config.size_limit,
        allowAttach: config.allow_attach,
        blockReads: config.block_reads,
        blockWrites: config.block_writes,
        deleteProtection: config.delete_protection,
        allowedIps: config.allowed_ips,
        allowedAwsVpcIds: config.allowed_aws_vpc_ids
      };
    }

    if (ctx.input.includeUsage) {
      let usageResult = await client.getDatabaseUsage(ctx.input.databaseName);
      let usage = usageResult.database;
      output.usage = {
        uuid: usage.uuid,
        instances: usage.instances.map(inst => ({
          uuid: inst.uuid,
          rowsRead: inst.usage.rows_read,
          rowsWritten: inst.usage.rows_written,
          storageBytes: inst.usage.storage_bytes
        }))
      };
    }

    if (ctx.input.includeStats) {
      let statsResult = await client.getDatabaseStats(ctx.input.databaseName);
      output.topQueries = statsResult.top_queries.map(q => ({
        query: q.query,
        rowsRead: q.rows_read,
        rowsWritten: q.rows_written
      }));
    }

    if (ctx.input.includeInstances) {
      let instancesResult = await client.listDatabaseInstances(ctx.input.databaseName);
      output.instances = instancesResult.instances.map(inst => ({
        instanceUuid: inst.uuid,
        instanceName: inst.name,
        type: inst.type,
        region: inst.region,
        hostname: inst.hostname
      }));
    }

    return {
      output,
      message: `Retrieved database **${db.Name}**.${db.group ? ` Group: **${db.group}**.` : ''}${db.primaryRegion ? ` Primary region: **${db.primaryRegion}**.` : ''}`
    };
  })
  .build();
