import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

export let getTableMetadata = SlateTool.create(spec, {
  name: 'Get Table Metadata',
  key: 'get_table_metadata',
  description:
    'Inspect a table and its fields before building an MBQL query or understanding available data.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ tableId: z.number().int().positive().describe('Metabase table ID') }))
  .output(
    z.object({
      tableId: z.number(),
      databaseId: z.number().optional(),
      name: z.string(),
      displayName: z.string().optional(),
      schema: z.string().nullable().optional(),
      fields: z.array(
        z.object({
          fieldId: z.number(),
          name: z.string(),
          displayName: z.string().optional(),
          baseType: z.string(),
          semanticType: z.string().nullable().optional(),
          active: z.boolean().optional(),
          visibilityType: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient(ctx.auth);
    let table = await client.getTableMetadata(ctx.input.tableId);
    let fields = (Array.isArray(table.fields) ? table.fields : []).map((field: any) => ({
      fieldId: field.id,
      name: field.name,
      displayName: field.display_name,
      baseType: field.base_type,
      semanticType: field.semantic_type ?? null,
      active: field.active,
      visibilityType: field.visibility_type
    }));
    return {
      output: {
        tableId: table.id ?? ctx.input.tableId,
        databaseId: table.db_id,
        name: table.name,
        displayName: table.display_name,
        schema: table.schema ?? null,
        fields
      },
      message: `Retrieved **${fields.length}** field(s) for table **${table.display_name ?? table.name}**`
    };
  })
  .build();
