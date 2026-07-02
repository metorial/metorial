import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let viewClassificationTool = SlateTool.create(spec, {
  name: 'View Classification',
  key: 'view_classification',
  description: `Retrieve the details of an existing document classification, including its name, description, and configured document types with their keywords and linked extraction templates.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      classificationId: z.string().describe('Unique identifier of the classification to view')
    })
  )
  .output(
    z.object({
      classificationId: z.string().describe('Unique identifier of the classification'),
      name: z.string().optional().describe('Name of the classification'),
      description: z.string().optional().describe('Description of the classification'),
      createdAt: z.number().optional().describe('Timestamp of creation'),
      documentTypes: z
        .array(
          z.object({
            name: z.string().describe('Document type name'),
            description: z.string().optional().describe('Document type description'),
            uniqueWords: z
              .array(z.string())
              .optional()
              .describe('Keywords for identification'),
            extractionId: z.string().optional().describe('Linked extraction template ID')
          })
        )
        .optional()
        .describe('Configured document types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.viewClassification(ctx.input.classificationId);
    let details = result.classificationDetails || {};

    return {
      output: {
        classificationId: result.classificationId,
        name: details.name,
        description: details.description,
        createdAt: details.createdAt,
        documentTypes: details.documentTypes
      },
      message: `Classification **${details.name || ctx.input.classificationId}** with ${details.documentTypes?.length || 0} document type(s).`
    };
  })
  .build();
