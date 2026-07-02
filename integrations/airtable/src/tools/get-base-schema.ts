import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let getBaseSchemaTool = SlateTool.create(spec, {
  name: 'Get Base Schema',
  key: 'get_base_schema',
  description: `Retrieve the full schema of the specified Airtable base, including all tables, their fields (with types and options), and views. Useful for understanding the structure of a base before querying or modifying data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      baseId: baseIdInput
    })
  )
  .output(
    z.object({
      tables: z.array(
        z.object({
          tableId: z.string().describe('Table ID'),
          tableName: z.string().describe('Table name'),
          description: z.string().optional().describe('Table description'),
          primaryFieldId: z.string().describe('ID of the primary field'),
          fields: z.array(
            z.object({
              fieldId: z.string().describe('Field ID'),
              fieldName: z.string().describe('Field name'),
              fieldType: z
                .string()
                .describe('Field type (e.g. singleLineText, number, singleSelect)'),
              description: z.string().optional().describe('Field description'),
              options: z
                .record(z.string(), z.any())
                .optional()
                .describe('Field type-specific options')
            })
          ),
          views: z.array(
            z.object({
              viewId: z.string().describe('View ID'),
              viewName: z.string().describe('View name'),
              viewType: z.string().describe('View type (e.g. grid, form, calendar)')
            })
          )
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    let schema = await client.getBaseSchema();

    return {
      output: {
        tables: schema.tables.map(t => ({
          tableId: t.id,
          tableName: t.name,
          description: t.description,
          primaryFieldId: t.primaryFieldId,
          fields: t.fields.map(f => ({
            fieldId: f.id,
            fieldName: f.name,
            fieldType: f.type,
            description: f.description,
            options: f.options
          })),
          views: t.views.map(v => ({
            viewId: v.id,
            viewName: v.name,
            viewType: v.type
          }))
        }))
      },
      message: `Retrieved schema with ${schema.tables.length} table(s) from the base.`
    };
  })
  .build();
