import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPicklistValues = SlateTool.create(spec, {
  name: 'Get Picklist Values',
  key: 'get_picklist_values',
  description: `Retrieve all available values for a picklist (dropdown) field on a specific object type.
Use this to discover valid options before creating or updating records with picklist fields.`,
  instructions: [
    'Use the object type number and the field system name. Use the List Object Fields tool to discover field names.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectId: z
        .union([z.number(), z.string()])
        .describe('The object type number (e.g., 1 for accounts)'),
      fieldName: z
        .string()
        .describe(
          'The system field name of the picklist field (e.g., "accounttypecode", "statuscode")'
        )
    })
  )
  .output(
    z.object({
      label: z.string().describe('Display label of the picklist field'),
      fieldName: z.string().describe('System field name'),
      values: z
        .array(
          z.object({
            name: z.string().describe('Display name of the option'),
            value: z.string().describe('Stored value of the option')
          })
        )
        .describe('Available picklist options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getPicklistValues(ctx.input.objectId, ctx.input.fieldName);

    return {
      output: {
        label: result.label,
        fieldName: result.fieldName,
        values: result.values
      },
      message: `Found **${result.values.length}** picklist options for field **${result.fieldName}** (${result.label}).`
    };
  })
  .build();
