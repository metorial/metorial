import { SlateTool } from 'slates';
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
Provide the record ID and a map of custom field names to their new values.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      recordId: z.number().describe('ID of the gage or calibration record'),
      fields: z
        .record(z.string(), z.any())
        .describe('Map of custom field names to their new values')
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

    let result = await client.updateCustomFieldValues({
      Id: ctx.input.recordId,
      ...ctx.input.fields
    });

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Updated custom field values for record **${ctx.input.recordId}**.`
    };
  })
  .build();
