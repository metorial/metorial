import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

let fieldValueSchema = z.object({
  fieldValueId: z.number().describe('Unique identifier of the field value'),
  fieldId: z.number().describe('ID of the field'),
  entityId: z.number().describe('ID of the entity this value belongs to'),
  listEntryId: z.number().nullable().describe('ID of the list entry (if list-specific)'),
  value: z.any().describe('The field value (type depends on field definition)'),
  createdAt: z.string().nullable().describe('When the value was set'),
  updatedAt: z.string().nullable().describe('When the value was last updated')
});

export let getFieldValues = SlateTool.create(spec, {
  name: 'Get Field Values',
  key: 'get_field_values',
  description: `Retrieve field values (custom data) for entities in Affinity. Filter by person, organization, opportunity, list entry, or specific field. Returns all custom field data associated with the entity.`,
  instructions: [
    'Use "Get Fields" first to discover field IDs and their types.',
    'At least one filter parameter should be provided.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      personId: z.number().optional().describe('Get field values for this person'),
      organizationId: z.number().optional().describe('Get field values for this organization'),
      opportunityId: z.number().optional().describe('Get field values for this opportunity'),
      listEntryId: z
        .number()
        .optional()
        .describe('Get field values for a specific list entry'),
      fieldId: z.number().optional().describe('Get values for a specific field only')
    })
  )
  .output(
    z.object({
      fieldValues: z.array(fieldValueSchema).describe('List of field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let result = await client.getFieldValues({
      personId: ctx.input.personId,
      organizationId: ctx.input.organizationId,
      opportunityId: ctx.input.opportunityId,
      listEntryId: ctx.input.listEntryId,
      fieldId: ctx.input.fieldId
    });

    let fieldValues = (Array.isArray(result) ? result : []).map((fv: any) => ({
      fieldValueId: fv.id,
      fieldId: fv.field_id,
      entityId: fv.entity_id,
      listEntryId: fv.list_entry_id ?? null,
      value: fv.value,
      createdAt: fv.created_at ?? null,
      updatedAt: fv.updated_at ?? null
    }));

    return {
      output: { fieldValues },
      message: `Retrieved **${fieldValues.length}** field value(s).`
    };
  })
  .build();

export let setFieldValue = SlateTool.create(spec, {
  name: 'Set Field Value',
  key: 'set_field_value',
  description: `Create a new field value for an entity in Affinity. This sets a custom field's value on a person, organization, or opportunity.

**Value formats by field type:**
- **Text/Number**: String or number
- **Date**: ISO 8601 date string
- **Dropdown**: The dropdown option ID
- **Person/Organization**: The entity ID
- **Location**: Object with street, city, state, country, etc.`,
  instructions: [
    'Use "Get Fields" to discover available field IDs and their types.',
    'For list-specific fields, also provide the listEntryId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fieldId: z.number().describe('ID of the field to set'),
      entityId: z.number().describe('ID of the entity (person, organization, or opportunity)'),
      value: z.any().describe('The value to set (format depends on field type)'),
      listEntryId: z
        .number()
        .optional()
        .describe('List entry ID (required for list-specific fields)')
    })
  )
  .output(fieldValueSchema)
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let fv = await client.createFieldValue({
      fieldId: ctx.input.fieldId,
      entityId: ctx.input.entityId,
      value: ctx.input.value,
      listEntryId: ctx.input.listEntryId
    });

    return {
      output: {
        fieldValueId: fv.id,
        fieldId: fv.field_id,
        entityId: fv.entity_id,
        listEntryId: fv.list_entry_id ?? null,
        value: fv.value,
        createdAt: fv.created_at ?? null,
        updatedAt: fv.updated_at ?? null
      },
      message: `Set field value (ID: ${fv.id}) for field ${fv.field_id} on entity ${fv.entity_id}.`
    };
  })
  .build();

export let updateFieldValue = SlateTool.create(spec, {
  name: 'Update Field Value',
  key: 'update_field_value',
  description: `Update an existing field value in Affinity. You must know the field value ID, which you can get from "Get Field Values".`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fieldValueId: z.number().describe('ID of the field value to update'),
      value: z.any().describe('New value (format depends on field type)')
    })
  )
  .output(fieldValueSchema)
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    let fv = await client.updateFieldValue(ctx.input.fieldValueId, {
      value: ctx.input.value
    });

    return {
      output: {
        fieldValueId: fv.id,
        fieldId: fv.field_id,
        entityId: fv.entity_id,
        listEntryId: fv.list_entry_id ?? null,
        value: fv.value,
        createdAt: fv.created_at ?? null,
        updatedAt: fv.updated_at ?? null
      },
      message: `Updated field value (ID: ${fv.id}).`
    };
  })
  .build();

export let deleteFieldValue = SlateTool.create(spec, {
  name: 'Delete Field Value',
  key: 'delete_field_value',
  description: `Delete a field value from an entity in Affinity. This removes the custom field data for that entity.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fieldValueId: z.number().describe('ID of the field value to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AffinityClient(ctx.auth.token);

    await client.deleteFieldValue(ctx.input.fieldValueId);

    return {
      output: { success: true },
      message: `Deleted field value with ID **${ctx.input.fieldValueId}**.`
    };
  })
  .build();
