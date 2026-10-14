import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAdditionalFields = SlateTool.create(spec, {
  name: 'Get Additional Fields',
  key: 'get_additional_fields',
  description:
    'Discover contact custom field IDs, names, keys, types, and allowed values before setting fields in upsert_contact or bulk_upsert_contacts.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      additionalFieldsLists: z
        .array(
          z.object({
            name: z.string().optional().describe('Custom field list name'),
            personalisationKey: z.string().optional().describe('List personalization key'),
            additionalFields: z
              .array(
                z.object({
                  id: z.number().optional().describe('Custom field ID'),
                  name: z.string().optional().describe('Field name'),
                  fieldKey: z.string().optional().describe('Field personalization key'),
                  description: z
                    .object({
                      type: z.string().optional().describe('Field data type'),
                      required: z
                        .boolean()
                        .optional()
                        .describe('Whether the field requires a value'),
                      readonly: z
                        .boolean()
                        .optional()
                        .describe('Whether the field is read-only'),
                      allowedValues: z
                        .object({
                          possibleValues: z
                            .array(z.string())
                            .optional()
                            .describe('Allowed choices'),
                          minValue: z.number().optional().describe('Minimum allowed value'),
                          maxValue: z.number().optional().describe('Maximum allowed value')
                        })
                        .optional()
                    })
                    .optional()
                })
              )
              .optional()
              .describe('Fields assigned to this list')
          })
        )
        .optional()
        .describe('Custom field lists available in the account')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getAdditionalFields();
    return {
      output: { additionalFieldsLists: result.additionalFieldsLists },
      message: `Retrieved **${result.additionalFieldsLists?.length ?? 0}** custom field list(s).`
    };
  })
  .build();
