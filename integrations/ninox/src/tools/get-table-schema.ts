import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, type NinoxTable } from '../lib/client';
import { spec } from '../spec';

export let getTableSchema = SlateTool.create(spec, {
  name: 'Get Table Schema',
  key: 'get_table_schema',
  description: `Retrieve the schema of tables in a database, including field definitions (IDs, names, types, and choice options). Can return all tables or a specific table. Useful for discovering the data model before querying records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID. Use list_teams to discover accessible teams.'),
      databaseId: z
        .string()
        .describe('Database ID. Use list_databases to discover databases.'),
      tableId: z
        .string()
        .optional()
        .describe('ID of a specific table (e.g. "A", "B"). If omitted, returns all tables.')
    })
  )
  .output(
    z.object({
      tables: z
        .array(
          z.object({
            tableId: z
              .string()
              .describe('Unique identifier of the table (e.g. "A", "B", "AA")'),
            name: z.string().describe('Name of the table'),
            fields: z
              .array(
                z.object({
                  fieldId: z.string().describe('Unique identifier of the field'),
                  name: z.string().describe('Name of the field'),
                  type: z
                    .string()
                    .describe(
                      'Data type of the field (e.g. string, number, date, choice, boolean)'
                    ),
                  choices: z
                    .array(
                      z.object({
                        choiceId: z.string().describe('ID of the choice option'),
                        caption: z.string().describe('Display label of the choice option')
                      })
                    )
                    .optional()
                    .describe('Available choice options for choice-type fields')
                })
              )
              .describe('Field definitions for the table')
          })
        )
        .describe('Table schema(s)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let tables: NinoxTable[];
    if (ctx.input.tableId) {
      let table = await client.getTable(
        ctx.input.teamId,
        ctx.input.databaseId,
        ctx.input.tableId
      );
      tables = [table];
    } else {
      tables = await client.listTables(ctx.input.teamId, ctx.input.databaseId);
    }

    if (tables.some(table => !Array.isArray(table.fields))) {
      throw createApiServiceError('Ninox returned a table schema without field definitions.');
    }

    let output = {
      tables: tables.map(t => ({
        tableId: t.id,
        name: t.name,
        fields: t.fields.map(f => ({
          fieldId: f.id,
          name: f.name,
          type: f.type,
          ...(f.choices
            ? {
                choices: f.choices.map(c => ({
                  choiceId: c.id,
                  caption: c.caption
                }))
              }
            : {})
        }))
      }))
    };

    return {
      output,
      message: ctx.input.tableId
        ? `Retrieved schema for table **${output.tables[0]?.name}** with **${output.tables[0]?.fields.length}** field(s).`
        : `Retrieved schema for **${output.tables.length}** table(s).`
    };
  })
  .build();
