import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `List all databases in the organization. Returns database names, hostnames, regions, group assignments, and status information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      databases: z.array(
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
          version: z.string().describe('Database version')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationSlug: ctx.config.organizationSlug
    });

    let result = await client.listDatabases();

    let databases = result.databases.map(db => ({
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
    }));

    return {
      output: { databases },
      message: `Found **${databases.length}** database(s) in the organization.`
    };
  })
  .build();
