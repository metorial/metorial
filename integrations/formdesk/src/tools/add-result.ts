import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let addResult = SlateTool.create(spec, {
  name: 'Add Form Result',
  key: 'add_result',
  description: `Adds a new result entry (submission) to a form programmatically. Field keys must match the exact field identifiers defined in the Formdesk form builder. Supports file uploads via base64-encoded values.`,
  instructions: [
    'Field keys must match the form field identifiers exactly as defined in the Formdesk form builder.',
    'For file uploads, provide the base64-encoded file content as the field value.'
  ]
})
  .input(
    z.object({
      formName: z.string().describe('Name or identifier of the form to add a result to'),
      fields: z
        .record(z.string(), z.string())
        .describe('Field data as key-value pairs where keys match form field identifiers'),
      processMessages: z
        .boolean()
        .optional()
        .describe(
          'Whether to trigger configured form messages (e.g., confirmation emails) after adding the result'
        )
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('The unique ID of the newly created result entry'),
      createdFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('System fields returned for the created entry')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Adding form result...');
    let result = await client.addResult({
      formName: ctx.input.formName,
      fields: ctx.input.fields,
      processMessages: ctx.input.processMessages
    });

    let resultId = String(result?.id || result?.resultId || '');
    let createdFields: Record<string, any> = {};

    if (result && typeof result === 'object') {
      for (let [key, value] of Object.entries(result)) {
        if (key !== 'id' && key !== 'resultId') {
          createdFields[key] = value;
        }
      }
    }

    return {
      output: {
        resultId,
        createdFields: Object.keys(createdFields).length > 0 ? createdFields : undefined
      },
      message: `Successfully added new result **${resultId}** to form "${ctx.input.formName}".`
    };
  })
  .build();
