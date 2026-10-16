import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomFields = SlateTool.create(spec, {
  name: 'Get Custom Fields',
  key: 'get_custom_fields',
  description: `Retrieve custom field definitions configured for your GageList account.
Returns the list of custom fields that extend the standard gage and calibration data model with organization-specific fields.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customFields: z.any().describe('Custom field definitions'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCustomFields();

    return {
      output: {
        customFields: result.data,
        success: result.success
      },
      message: `Retrieved custom field definitions.`
    };
  })
  .build();

export let getCustomFieldValues = SlateTool.create(spec, {
  name: 'Get Custom Field Values',
  key: 'get_custom_field_values',
  description: `Retrieve custom field values for a specific record (gage or calibration) in GageList.
Returns the current values of all custom fields associated with the specified record.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      recordId: z.number().describe('ID of the gage or calibration record')
    })
  )
  .output(
    z.object({
      customFieldValues: z.any().describe('Custom field values for the record'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCustomFieldValues(ctx.input.recordId);

    return {
      output: {
        customFieldValues: result.data,
        success: result.success
      },
      message: `Retrieved custom field values for record **${ctx.input.recordId}**.`
    };
  })
  .build();

export let updateCustomFieldValues = SlateTool.create(spec, {
  name: 'Update Custom Field Values',
  key: 'update_custom_field_values',
  description: `Update custom field values for a record in GageList.
Provide the record ID and a map of custom field names to their new values. Specify Calibration for calibration records. Supply existing custom-value IDs when updating saved values; omitted value IDs create new values.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      recordId: z.number().describe('ID of the gage or calibration record'),
      recordType: z
        .enum(['Gage', 'Calibration'])
        .optional()
        .describe('Record type; defaults to Gage. Use Calibration for a calibration record.'),
      valueIds: z
        .record(z.string(), z.number())
        .optional()
        .describe(
          'Map of custom field names to existing custom-value record IDs. Omit a name to create its value.'
        ),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Map of custom field names from get_custom_fields to their new values. Non-string values are serialized as JSON text.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful'),
      message: z.string().optional().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let entries = Object.entries(ctx.input.fields);
    if (entries.length === 0) {
      throw createApiServiceError('Provide at least one custom field value.');
    }
    let definitions = await client.getCustomFields();
    let values = entries.map(([name, value]) => {
      let matches = definitions.data.filter(
        (field: { FieldName?: unknown; Id?: unknown }) => field.FieldName === name
      );
      if (matches.length !== 1 || typeof matches[0].Id !== 'number') {
        throw createApiServiceError(
          `Custom field "${name}" was not found uniquely. Call get_custom_fields and use an exact field name.`
        );
      }
      let fieldValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (fieldValue === undefined) {
        throw createApiServiceError(`Provide a JSON value for custom field "${name}".`);
      }
      return {
        Id: ctx.input.valueIds?.[name] ?? 0,
        FieldId: matches[0].Id,
        RefID: ctx.input.recordId,
        RefType: ctx.input.recordType === 'Calibration' ? 2 : 1,
        FieldValue: fieldValue
      };
    });
    let result = await client.updateCustomFieldValues(values);

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Updated custom field values for record **${ctx.input.recordId}**.`
    };
  })
  .build();
