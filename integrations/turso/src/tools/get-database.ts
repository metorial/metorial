import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieve detailed information about a specific database, including its configuration, instances, usage statistics, and top queries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
  .output(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      databaseId: z.string().describe('Unique identifier of the database'),
      hostname: z.string().describe('Hostname for connecting to the database'),
      regions: z.array(z.string()).describe('Regions where the database is replicated'),
      primaryRegion: z.string().describe('Primary region of the database'),
      group: z.string().describe('Group the database belongs to'),
      type: z.string().describe('Type of the database'),
      isSchema: z.boolean().describe('Whether the database is a schema database'),
      schema: z.string().optional().describe('Parent schema database name, if applicable'),
      sleeping: z.boolean().describe('Whether the database is currently sleeping'),
      blockReads: z.boolean().describe('Whether reads are blocked'),
      blockWrites: z.boolean().describe('Whether writes are blocked'),
      allowAttach: z.boolean().describe('Whether ATTACH is allowed'),
      version: z.string().describe('Database version'),
      configuration: z
        .object({
          sizeLimit: z.string().optional(),
          allowAttach: z.boolean().optional(),
          blockReads: z.boolean().optional(),
          blockWrites: z.boolean().optional()
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
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let result = await client.getDatabase(ctx.input.databaseName);
    let db = result.database;

    let output: Record<string, unknown> = {
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
        blockWrites: config.block_writes
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
      output: output as any,
      message: `Retrieved database **${db.Name}** in group **${db.group}** (primary: ${db.primaryRegion}, regions: ${db.regions.join(', ')}).`
    };
  })
  .build();
