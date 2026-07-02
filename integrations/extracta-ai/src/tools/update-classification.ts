import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let documentTypeSchema = z.object({
  name: z.string().describe('Category label'),
  description: z.string().describe('Description of this document type'),
  uniqueWords: z.array(z.string()).describe('Keywords that help identify this document type'),
  extractionId: z.string().optional().describe('Link to an extraction template')
});

export let updateClassificationTool = SlateTool.create(spec, {
  name: 'Update Classification',
  key: 'update_classification',
  description: `Update an existing document classification. Modify the name, description, or document types. Only provided parameters will be changed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      classificationId: z
        .string()
        .describe('Unique identifier of the classification to update'),
      name: z.string().optional().describe('New name for the classification'),
      description: z.string().optional().describe('New description'),
      documentTypes: z.array(documentTypeSchema).optional().describe('Updated document types')
    })
  )
  .output(
    z.object({
      classificationId: z.string().describe('Unique identifier of the updated classification'),
      status: z.string().describe('Update status'),
      updatedAt: z.number().describe('Timestamp of update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.updateClassification({
      classificationId: ctx.input.classificationId,
      name: ctx.input.name,
      description: ctx.input.description,
      documentTypes: ctx.input.documentTypes
    });

    return {
      output: {
        classificationId: result.classificationId,
        status: result.status,
        updatedAt: result.updatedAt
      },
      message: `Updated classification \`${ctx.input.classificationId}\`.`
    };
  })
  .build();
