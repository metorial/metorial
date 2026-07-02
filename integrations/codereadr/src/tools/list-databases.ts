import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDatabases = SlateTool.create(spec, {
  name: 'List Databases',
  key: 'list_databases',
  description: `Retrieve barcode validation databases from your CodeREADr account. Databases hold barcode values against which scans are validated, along with optional response text.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseId: z
        .string()
        .optional()
        .describe('Specific database ID to retrieve. Leave empty to retrieve all databases.')
    })
  )
  .output(
    z.object({
      databases: z
        .array(
          z
            .object({
              databaseId: z.string().describe('Unique ID of the database'),
              name: z.string().optional().describe('Database name'),
              count: z.string().optional().describe('Number of values in the database'),
              services: z
                .array(
                  z.object({
                    serviceId: z.string()
                  })
                )
                .optional()
                .describe('Services linked to this database')
            })
            .passthrough()
        )
        .describe('List of databases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let databases = await client.retrieveDatabases(ctx.input.databaseId);

    return {
      output: { databases },
      message: ctx.input.databaseId
        ? `Retrieved database **${ctx.input.databaseId}**.`
        : `Retrieved **${databases.length}** database(s).`
    };
  })
  .build();
