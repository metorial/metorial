import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  tags: { readOnly: false },
  name: 'Create Database',
  key: 'create_database',
  description: `Choose an organization with list_organizations. Create a new database within a group. Supports seeding from an existing database or a dump URL. Dump seeds are retained in the official SDK but omitted from the current OpenAPI; availability depends on the account/API deployment. Multi-DB schemas are available only to eligible existing paid accounts.`,
  instructions: [
    "The database is created in the specified group and inherits the group's locations.",
    'Use the seed parameter to initialize from an existing database or dump.'
  ]
})
  .input(
    z.object({
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        ),
      databaseName: z.string().describe('Name for the new database'),
      groupName: z.string().describe('Name of the group to create the database in'),
      seed: z
        .object({
          type: z
            .enum(['database', 'dump'])
            .describe(
              'Type of seed source. Dump seeds remain in the official SDK but are absent from the current OpenAPI; availability depends on the account/API deployment.'
            ),
          name: z
            .string()
            .optional()
            .describe('Name of the source database (for type "database")'),
          url: z
            .string()
            .optional()
            .describe('HTTP(S) URL of the dump file (for type "dump")'),
          timestamp: z
            .string()
            .optional()
            .describe('Point-in-time recovery timestamp (ISO 8601) for database seed')
        })
        .optional()
        .describe('Seed configuration to initialize the database with data'),
      sizeLimit: z
        .string()
        .optional()
        .describe('Maximum database size (e.g., "256mb", "1gb")'),
      isSchema: z
        .boolean()
        .optional()
        .describe('Whether to create a schema database for multi-DB schema management'),
      schema: z
        .string()
        .optional()
        .describe('Name of a parent schema database to inherit schema from')
    })
  )
  .output(
    z.object({
      databaseName: z.string().describe('Name of the created database'),
      databaseId: z.string().describe('Unique identifier of the database'),
      hostname: z.string().describe('Hostname for connecting to the database'),
      regions: z
        .array(z.string())
        .optional()
        .describe('Regions where the database is replicated'),
      primaryRegion: z.string().optional().describe('Primary region of the database'),
      group: z.string().optional().describe('Group the database belongs to'),
      type: z.string().optional().describe('Type of the database'),
      isSchema: z.boolean().optional().describe('Whether the database is a schema database')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.createDatabase({
      name: ctx.input.databaseName,
      group: ctx.input.groupName,
      seed: ctx.input.seed,
      size_limit: ctx.input.sizeLimit,
      is_schema: ctx.input.isSchema,
      schema: ctx.input.schema
    });

    let db = result.database;

    return {
      output: {
        databaseName: db.Name,
        databaseId: db.DbId,
        hostname: db.Hostname,
        regions: db.regions,
        primaryRegion: db.primaryRegion,
        group: db.group,
        type: db.type,
        isSchema: db.is_schema
      },
      message: `Created database **${db.Name}**.${db.group ? ` Group: **${db.group}**.` : ''}${db.primaryRegion ? ` Primary region: **${db.primaryRegion}**.` : ''}`
    };
  })
  .build();
