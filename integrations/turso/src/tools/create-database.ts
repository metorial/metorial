import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDatabase = SlateTool.create(spec, {
  name: 'Create Database',
  key: 'create_database',
  description: `Create a new database within a group. Supports seeding from an existing database or a dump URL. Can also create schema databases for multi-DB schema management.`,
  instructions: [
    "The database is created in the specified group and inherits the group's locations.",
    'Use the seed parameter to initialize from an existing database or dump.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name for the new database'),
      groupName: z.string().describe('Name of the group to create the database in'),
      seed: z
        .object({
          type: z.enum(['database', 'dump']).describe('Type of seed source'),
          name: z
            .string()
            .optional()
            .describe('Name of the source database (for type "database")'),
          url: z.string().optional().describe('URL of the dump file (for type "dump")'),
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
      regions: z.array(z.string()).describe('Regions where the database is replicated'),
      primaryRegion: z.string().describe('Primary region of the database'),
      group: z.string().describe('Group the database belongs to'),
      type: z.string().describe('Type of the database'),
      isSchema: z.boolean().describe('Whether the database is a schema database')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

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
      message: `Created database **${db.Name}** in group **${db.group}** (primary: ${db.primaryRegion}).`
    };
  })
  .build();
