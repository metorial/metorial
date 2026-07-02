import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      teamId: z.string().describe('ID of the team'),
      databaseId: z.string().describe('ID of the database'),
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
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let tables: any;
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

    let output = {
      tables: tables.map((t: any) => ({
        tableId: t.id,
        name: t.name,
        fields: (t.fields || []).map((f: any) => ({
          fieldId: f.id,
          name: f.name,
          type: f.type,
          ...(f.choices
            ? {
                choices: f.choices.map((c: any) => ({
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
