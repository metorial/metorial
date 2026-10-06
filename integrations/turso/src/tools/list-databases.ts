import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientForContext } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `Choose an organization with list_organizations. List all databases in the organization. Returns database names, hostnames, regions, group assignments, and status information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupName: z
        .string()
        .optional()
        .describe('Filter by a group name; discover it with list_groups.'),
      parentDatabaseId: z
        .string()
        .optional()
        .describe('Filter branches by their parent database ID.'),
      organizationSlug: z
        .string()
        .optional()
        .describe(
          'Organization slug. Call list_organizations to discover authorized organizations; older connections may use their saved organization.'
        )
    })
  )
  .output(
    z.object({
      databases: z.array(
        z.object({
          databaseName: z.string().describe('Name of the database'),
          databaseId: z.string().describe('Unique identifier of the database'),
          hostname: z.string().describe('Hostname for connecting to the database'),
          regions: z
            .array(z.string())
            .optional()
            .describe('Regions where the database is replicated'),
          primaryRegion: z.string().optional().describe('Primary region of the database'),
          group: z.string().optional().describe('Group the database belongs to'),
          type: z.string().optional().describe('Type of the database'),
          isSchema: z
            .boolean()
            .optional()
            .describe('Whether the database is a schema database'),
          schema: z.string().optional().describe('Parent schema database name, if applicable'),
          sleeping: z
            .boolean()
            .optional()
            .describe('Whether the database is currently sleeping'),
          blockReads: z.boolean().optional().describe('Whether reads are blocked'),
          blockWrites: z.boolean().optional().describe('Whether writes are blocked'),
          allowAttach: z.boolean().optional().describe('Whether ATTACH is allowed'),
          version: z.string().optional().describe('Database version')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientForContext(ctx);

    let result = await client.listDatabases({
      group: ctx.input.groupName,
      parent: ctx.input.parentDatabaseId
    });

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
