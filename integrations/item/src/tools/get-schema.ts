import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldName: z.string().describe('API field name'),
  displayName: z.string().describe('Human-readable field name'),
  fieldType: z.string().describe('Field type such as text, select, relation, or number'),
  fieldOrder: z.number().int().optional().describe('Field display order'),
  isRequired: z.boolean().optional().describe('Whether the field is required'),
  description: z.string().nullable().optional().describe('Field description when available'),
  selectOptions: z
    .array(
      z.object({
        label: z.string().describe('Select option label'),
        value: z.string().describe('Select option value'),
        color: z.string().nullable().optional().describe('Option color when available')
      })
    )
    .nullable()
    .optional()
    .describe('Select or multi-select options'),
  allowMultiple: z
    .boolean()
    .nullable()
    .optional()
    .describe('Whether the field supports multiple selected values'),
  relatedObjectTypeId: z
    .number()
    .int()
    .nullable()
    .optional()
    .describe('Related object type ID for relationship fields'),
  relationshipType: z
    .enum(['one_to_one', 'one_to_many', 'many_to_one', 'many_to_many'])
    .nullable()
    .optional()
    .describe('Documented relationship cardinality for relationship fields'),
  numberMin: z.number().nullable().optional().describe('Minimum allowed numeric value'),
  numberMax: z.number().nullable().optional().describe('Maximum allowed numeric value'),
  numberDecimalPlaces: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .describe('Allowed decimal places for number fields'),
  currencyDecimalPlaces: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .describe('Allowed decimal places for currency fields'),
  defaultValue: z.string().nullable().optional().describe('Default value when defined'),
  visibilityType: z.string().optional().describe('Visibility mode for the field')
});

export let getSchema = SlateTool.create(spec, {
  name: 'Get Schema',
  key: 'get_schema',
  description:
    'Retrieve the item schema for all available object types, including field definitions and select options. Useful for discovering custom objects and valid field names before creating or updating records.',
  docs: [
    {
      type: 'docs.action.general',
      name: 'Get object schema',
      url: 'https://docs.item.app/api-reference/schema/get-object-schema'
    }
  ],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      objectTypes: z.array(
        z.object({
          objectTypeId: z.number().int().positive().describe('Object type ID'),
          objectTypeSlug: z.string().describe('Object type slug'),
          displayName: z.string().describe('Display name shown in item'),
          pluralDisplayName: z
            .string()
            .nullable()
            .optional()
            .describe('Plural display name when available'),
          description: z.string().nullable().optional().describe('Object type description'),
          icon: z.string().nullable().optional().describe('Object type icon when available'),
          fields: z.array(fieldSchema).describe('Field definitions for this object type')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let objectTypes = await client.getSchema();

    return {
      output: {
        objectTypes: objectTypes.map(objectType => ({
          objectTypeId: objectType.id,
          objectTypeSlug: objectType.slug,
          displayName: objectType.display_name,
          pluralDisplayName: objectType.plural_display_name ?? null,
          description: objectType.description ?? null,
          icon: objectType.icon ?? null,
          fields: (objectType.fields ?? []).map(field => ({
            fieldName: field.field_name,
            displayName: field.display_name,
            fieldType: field.field_type,
            fieldOrder: field.field_order,
            isRequired: field.is_required,
            description: field.description ?? null,
            selectOptions: field.select_options
              ? field.select_options.map(option => ({
                  label: option.label,
                  value: option.value,
                  color: option.color ?? null
                }))
              : null,
            allowMultiple: field.allow_multiple ?? null,
            relatedObjectTypeId: field.related_object_type_id ?? null,
            relationshipType: field.relationship_type ?? null,
            numberMin: field.number_min ?? null,
            numberMax: field.number_max ?? null,
            numberDecimalPlaces: field.number_decimal_places ?? null,
            currencyDecimalPlaces: field.currency_decimal_places ?? null,
            defaultValue: field.default_value ?? null,
            visibilityType: field.visibility_type
          }))
        }))
      },
      message: `Retrieved schema for **${objectTypes.length}** object type(s).`
    };
  })
  .build();
