import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFields = SlateTool.create(spec, {
  name: 'List Fields',
  key: 'list_fields',
  description: `List all fields (columns) in a Baserow table. Returns field IDs, names, types, and configuration. Useful for understanding table schema before performing row operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableId: z.number().describe('The ID of the table to list fields from')
    })
  )
  .output(
    z.object({
      fields: z
        .array(
          z
            .object({
              fieldId: z.number().describe('Field ID'),
              name: z.string().describe('Field name'),
              type: z
                .string()
                .describe(
                  'Field type (e.g. text, number, boolean, date, single_select, etc.)'
                ),
              order: z.number().describe('Display order'),
              primary: z.boolean().optional().describe('Whether this is the primary field'),
              readOnly: z.boolean().optional().describe('Whether this field is read-only')
            })
            .catchall(z.any())
        )
        .describe('Array of field objects with their configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      baseUrl: ctx.config.baseUrl
    });

    let fields = await client.listFields(ctx.input.tableId);

    return {
      output: {
        fields: fields.map((f: any) => ({
          fieldId: f.id,
          name: f.name,
          type: f.type,
          order: f.order,
          primary: f.primary,
          readOnly: f.read_only,
          ...f
        }))
      },
      message: `Found **${fields.length}** field(s) in table ${ctx.input.tableId}.`
    };
  })
  .build();
