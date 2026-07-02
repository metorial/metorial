import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.union([z.number(), z.string()]).optional().describe('Field ID or field code'),
  key: z.string().optional().describe('API key used in entity payloads'),
  name: z.string().optional().describe('Field label'),
  fieldType: z.string().optional().describe('Field type'),
  type: z.string().optional().describe('Underlying value type'),
  mandatoryFlag: z.boolean().optional().describe('Whether this field is mandatory'),
  activeFlag: z.boolean().optional().describe('Whether this field is active'),
  editFlag: z.boolean().optional().describe('Whether this field can be edited'),
  addTime: z.string().optional().describe('Creation timestamp'),
  updateTime: z.string().optional().nullable().describe('Last update timestamp'),
  options: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('Available options for option-based fields')
});

let toBoolean = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return undefined;
};

let mapField = (field: any) => ({
  fieldId: field.id ?? field.field_code,
  key: field.key ?? field.field_code,
  name: field.name ?? field.field_name,
  fieldType: field.field_type,
  type: field.type ?? field.data_type,
  mandatoryFlag: toBoolean(field.mandatory_flag),
  activeFlag: toBoolean(field.active_flag),
  editFlag: toBoolean(field.edit_flag),
  addTime: field.add_time ?? undefined,
  updateTime: field.update_time ?? undefined,
  options: field.options ?? undefined
});

export let getFields = SlateTool.create(spec, {
  name: 'Get Fields',
  key: 'get_fields',
  description: `Retrieve Pipedrive field metadata for deals, persons, organizations, or products. Use this to discover custom field keys and option values before creating or updating records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['deal', 'person', 'organization', 'product'])
        .describe('Entity type whose field metadata should be retrieved'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Number of fields to return'),
      includeFields: z
        .array(z.enum(['ui_visibility', 'important_fields', 'required_fields']))
        .optional()
        .describe('Additional field metadata namespaces to include')
    })
  )
  .output(
    z.object({
      resourceType: z.string().describe('Entity type requested'),
      fields: z.array(fieldSchema).describe('Field metadata'),
      nextCursor: z.string().optional().describe('Cursor for the next page of fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let params = {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      includeFields: ctx.input.includeFields?.join(',')
    };
    let result: any;

    if (ctx.input.resourceType === 'deal') {
      result = await client.getDealFields(params);
    } else if (ctx.input.resourceType === 'person') {
      result = await client.getPersonFields(params);
    } else if (ctx.input.resourceType === 'organization') {
      result = await client.getOrganizationFields(params);
    } else {
      result = await client.getProductFields(params);
    }

    let fields = (result?.data || []).map(mapField);

    return {
      output: {
        resourceType: ctx.input.resourceType,
        fields,
        nextCursor: result?.additional_data?.next_cursor ?? undefined
      },
      message: `Found **${fields.length}** ${ctx.input.resourceType} field(s).`
    };
  });
