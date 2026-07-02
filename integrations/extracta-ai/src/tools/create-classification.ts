import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentTypeSchema = z.object({
  name: z.string().describe('Category label (e.g., "Invoice", "Receipt", "Contract")'),
  description: z
    .string()
    .describe('Description of this document type and its characteristics'),
  uniqueWords: z.array(z.string()).describe('Keywords that help identify this document type'),
  extractionId: z
    .string()
    .optional()
    .describe('Link to an extraction template to auto-extract data upon classification')
});

export let createClassificationTool = SlateTool.create(spec, {
  name: 'Create Classification',
  key: 'create_classification',
  description: `Create a document classification that automatically categorizes documents into predefined types based on content. Each document type can include keywords for identification and optionally link to an extraction template for automatic data extraction.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the classification'),
      description: z.string().optional().describe('Description of the classification purpose'),
      documentTypes: z.array(documentTypeSchema).describe('Document types to classify into')
    })
  )
  .output(
    z.object({
      classificationId: z
        .string()
        .describe('Unique identifier for the created classification'),
      status: z.string().describe('Creation status'),
      createdAt: z.number().describe('Timestamp of creation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createClassification({
      name: ctx.input.name,
      description: ctx.input.description,
      documentTypes: ctx.input.documentTypes
    });

    return {
      output: {
        classificationId: result.classificationId,
        status: result.status,
        createdAt: result.createdAt
      },
      message: `Created classification **${ctx.input.name}** with ID \`${result.classificationId}\` and ${ctx.input.documentTypes.length} document type(s).`
    };
  })
  .build();
