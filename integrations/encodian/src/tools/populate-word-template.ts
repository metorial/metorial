import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let populateWordTemplate = SlateTool.create(spec, {
  name: 'Populate Word Template',
  key: 'populate_word_template',
  description: `Generate documents by populating a Word (DOCX) template with dynamic data from JSON.
Templates use Encodian's syntax supporting conditional expressions, repeating content, numbered lists, and formatting. The JSON data is mapped to placeholders/tagged fields within the template.`,
  instructions: [
    'Provide the Word template as base64-encoded content and the data as a JSON string.',
    "The template must use Encodian's placeholder syntax for data binding."
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded Word template (.docx) file content'),
      documentData: z
        .string()
        .describe('JSON string containing the data to populate the template with'),
      jsonParseMode: z.enum(['Standard', 'Strict']).optional().describe('JSON parsing mode'),
      allowMissingMembers: z
        .boolean()
        .optional()
        .describe('Allow missing members in data without errors'),
      inlineErrorMessages: z
        .boolean()
        .optional()
        .describe('Show error messages inline in the document')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded populated Word document'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let body: Record<string, any> = {
      fileContent: ctx.input.fileContent,
      documentData: ctx.input.documentData
    };

    if (ctx.input.jsonParseMode) body.jsonParseMode = ctx.input.jsonParseMode;
    if (ctx.input.allowMissingMembers !== undefined)
      body.allowMissingMembers = ctx.input.allowMissingMembers;
    if (ctx.input.inlineErrorMessages !== undefined)
      body.inlineErrorMessages = ctx.input.inlineErrorMessages;

    let result = await client.populateWordDocument(body);

    return {
      output: {
        fileName: result.Filename,
        fileContent: result.FileContent,
        operationId: result.OperationId
      },
      message: `Successfully populated Word template. Output: **${result.Filename}**`
    };
  })
  .build();
