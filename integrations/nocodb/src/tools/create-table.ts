import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTable = SlateTool.create(spec, {
  name: 'Create Table',
  key: 'create_table',
  description: `Create a new table in a NocoDB base. Optionally provide initial column definitions. If no columns are specified, a default table with a Title column is created.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: z.string().describe('The base ID (prefixed with p)'),
      tableName: z.string().describe('Name for the new table'),
      title: z
        .string()
        .optional()
        .describe('Display title for the table (defaults to tableName)'),
      columns: z
        .array(
          z.object({
            title: z.string().describe('Column title'),
            uidt: z
              .string()
              .describe(
                'UI data type: SingleLineText, LongText, Number, Decimal, Email, URL, Checkbox, SingleSelect, MultiSelect, Date, DateTime, Attachment, LinkToAnotherRecord, etc.'
              ),
            dtxp: z
              .string()
              .optional()
              .describe('Options for select fields (comma-separated values)')
          })
        )
        .optional()
        .describe('Initial column definitions')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('ID of the created table'),
      title: z.string().describe('Title of the created table')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = await client.createTable(ctx.input.baseId, {
      table_name: ctx.input.tableName,
      title: ctx.input.title,
      columns: ctx.input.columns
    });

    return {
      output: {
        tableId: result.id,
        title: result.title ?? ctx.input.tableName
      },
      message: `Created table **${result.title ?? ctx.input.tableName}** (\`${result.id}\`) in base \`${ctx.input.baseId}\`.`
    };
  })
  .build();
