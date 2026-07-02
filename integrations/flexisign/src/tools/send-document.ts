import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexisignClient } from '../lib/client';
import { spec } from '../spec';

export let sendDocument = SlateTool.create(spec, {
  name: 'Send Document for Signing',
  key: 'send_document',
  description: `Create a document from a template and send it to recipients for signing. The required fields depend on the template's body structure. Use **Get Template** first to inspect the \`bodyStructure\` and determine which fields to provide.`,
  instructions: [
    'Use the Get Template tool first to retrieve the template body structure, which defines the required fields for creating a document.',
    'The templateFields parameter should contain all key-value pairs from the template body structure, with recipient details (names, emails) and any custom message filled in.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .describe('The ID of the template to use for creating the document'),
      templateFields: z
        .record(z.string(), z.unknown())
        .describe(
          'Key-value pairs matching the template body structure. Includes recipient details (names, emails), document message, and other fields defined by the template.'
        )
    })
  )
  .output(
    z.object({
      response: z
        .record(z.string(), z.unknown())
        .describe('Response from FlexiSign after creating and sending the document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexisignClient({ token: ctx.auth.token });

    let body: Record<string, unknown> = {
      templateId: ctx.input.templateId,
      ...ctx.input.templateFields
    };

    let response = await client.sendDocumentFromTemplate(body);

    return {
      output: {
        response
      },
      message: `Signature request sent using template \`${ctx.input.templateId}\`.`
    };
  })
  .build();
