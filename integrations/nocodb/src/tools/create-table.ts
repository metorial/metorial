import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireRecord, requireString } from '../lib/schemas';
import { spec } from '../spec';

export let createTable = SlateTool.create(spec, {
  name: 'Create Table',
  key: 'create_table',
  description: `Create a new table in a NocoDB base. Optionally provide initial column definitions and a source ID. Column defaults depend on the deployment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: z.string().describe('Base ID. Call list_bases to discover accessible bases.'),
      sourceId: z
        .string()
        .optional()
        .describe('Optional data source ID, available from get_base raw.sources.'),
      description: z.string().optional().describe('Table description'),
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
      title: z.string().describe('Title of the created table'),
      raw: z.any().optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });

    let result = requireRecord(
      await client.createTable(
        ctx.input.baseId,
        {
          table_name: ctx.input.tableName,
          title: ctx.input.title,
          columns: ctx.input.columns,
          description: ctx.input.description
        },
        ctx.input.sourceId
      ),
      'created table'
    );

    return {
      output: {
        tableId: requireString(result.id, 'table ID'),
        title: requireString(result.title, 'table title'),
        raw: result
      },
      message: `Created table **${result.title ?? ctx.input.tableName}** (\`${result.id}\`) in base \`${ctx.input.baseId}\`.`
    };
  })
  .build();
