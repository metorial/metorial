import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { airtableServiceError } from '../lib/errors';
import { spec } from '../spec';
import { baseIdInput } from './base-id';

export let manageTableTool = SlateTool.create(spec, {
  name: 'Manage Table',
  key: 'manage_table',
  description: `Create a new table or update an existing table in the specified Airtable base. When creating, provide the table name and initial fields. When updating, provide the table ID and new name or description.`,
  instructions: [
    'To create a table, set **action** to "create" and provide tableName and fields.',
    'To update, set **action** to "update" and provide tableId with the updated name and/or description.',
    'Common field types: singleLineText, multilineText, number, percent, currency, email, url, phoneNumber, checkbox, singleSelect, multipleSelects, date, dateTime, rating, richText, multipleAttachments, autoNumber.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      baseId: baseIdInput,
      action: z
        .enum(['create', 'update'])
        .describe('Whether to create a new table or update an existing one'),
      tableId: z.string().optional().describe('Table ID to update (required for update)'),
      tableName: z.string().optional().describe('Name for the table'),
      description: z.string().optional().describe('Description for the table'),
      fields: z
        .array(
          z.object({
            fieldName: z.string().describe('Field name'),
            fieldType: z
              .string()
              .describe('Field type (e.g. singleLineText, number, singleSelect)'),
            description: z.string().optional().describe('Field description'),
            options: z
              .record(z.string(), z.any())
              .optional()
              .describe('Field type-specific options (e.g. choices for select fields)')
          })
        )
        .optional()
        .describe('Fields to create with the table (required for create action)')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('Table ID'),
      tableName: z.string().describe('Table name'),
      description: z.string().optional().describe('Table description'),
      fields: z
        .array(
          z.object({
            fieldId: z.string().describe('Field ID'),
            fieldName: z.string().describe('Field name'),
            fieldType: z.string().describe('Field type')
          })
        )
        .optional()
        .describe('Table fields (returned for create action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseId: ctx.input.baseId
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.tableName) {
        throw airtableServiceError('tableName is required when creating a table');
      }
      if (!ctx.input.fields || ctx.input.fields.length === 0)
        throw airtableServiceError('fields are required when creating a table');

      let mappedFields = ctx.input.fields.map(f => ({
        name: f.fieldName,
        type: f.fieldType,
        description: f.description,
        options: f.options
      }));

      let result = await client.createTable(
        ctx.input.tableName,
        mappedFields,
        ctx.input.description
      );

      return {
        output: {
          tableId: result.id,
          tableName: result.name,
          description: result.description,
          fields: result.fields?.map((f: any) => ({
            fieldId: f.id,
            fieldName: f.name,
            fieldType: f.type
          }))
        },
        message: `Created table **${result.name}** (${result.id}) with ${ctx.input.fields.length} field(s).`
      };
    } else {
      if (!ctx.input.tableId) {
        throw airtableServiceError('tableId is required when updating a table');
      }

      let updates: { name?: string; description?: string } = {};
      if (ctx.input.tableName) updates.name = ctx.input.tableName;
      if (ctx.input.description !== undefined) updates.description = ctx.input.description;

      let result = await client.updateTable(ctx.input.tableId, updates);

      return {
        output: {
          tableId: result.id,
          tableName: result.name,
          description: result.description
        },
        message: `Updated table **${result.name}** (${result.id}).`
      };
    }
  })
  .build();
