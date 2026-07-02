import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let updateResult = SlateTool.create(spec, {
  name: 'Update Form Result',
  key: 'update_result',
  description: `Updates an existing form result entry with new field data. Only the fields provided will be updated; other fields remain unchanged.`,
  instructions: [
    'Field keys must match the form field identifiers exactly as defined in the Formdesk form builder.',
    'Only include the fields you want to update. Omitted fields retain their current values.'
  ]
})
  .input(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry to update'),
      fields: z
        .record(z.string(), z.string())
        .describe('Updated field data as key-value pairs'),
      processMessages: z
        .boolean()
        .optional()
        .describe('Whether to trigger configured form messages after updating')
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('The ID of the updated result entry'),
      updatedFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('System fields returned after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Updating form result...');
    let result = await client.updateResult({
      resultId: ctx.input.resultId,
      fields: ctx.input.fields,
      processMessages: ctx.input.processMessages
    });

    let updatedFields: Record<string, any> = {};
    if (result && typeof result === 'object') {
      for (let [key, value] of Object.entries(result)) {
        updatedFields[key] = value;
      }
    }

    return {
      output: {
        resultId: ctx.input.resultId,
        updatedFields: Object.keys(updatedFields).length > 0 ? updatedFields : undefined
      },
      message: `Successfully updated result **${ctx.input.resultId}**.`
    };
  })
  .build();
