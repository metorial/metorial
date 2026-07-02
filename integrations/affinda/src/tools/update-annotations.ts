import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAnnotations = SlateTool.create(spec, {
  name: 'List Annotations',
  key: 'list_annotations',
  description: `Retrieve all annotations (extracted data points) for a specific document. Each annotation represents a field extracted by the AI model, such as a name, date, amount, or address.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentIdentifier: z
        .string()
        .describe('Identifier of the document to retrieve annotations for.')
    })
  )
  .output(
    z.object({
      annotations: z
        .array(
          z.object({
            annotationId: z.number().describe('Unique ID of the annotation.'),
            fieldName: z.string().optional().describe('Name of the extracted field.'),
            parsedValue: z.any().optional().describe('Parsed/extracted value.'),
            rawValue: z.string().optional().describe('Raw text value from the document.'),
            confidence: z
              .number()
              .optional()
              .describe('Confidence score of the extraction (0 to 1).'),
            isVerified: z
              .boolean()
              .optional()
              .describe('Whether this annotation has been verified.')
          })
        )
        .describe('List of annotations for the document.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listAnnotations(ctx.input.documentIdentifier);
    let annotations = (Array.isArray(result) ? result : (result.results ?? [])).map(
      (ann: any) => ({
        annotationId: ann.id,
        fieldName: ann.dataPoint ?? ann.fieldName,
        parsedValue: ann.parsed,
        rawValue: ann.raw,
        confidence: ann.confidence,
        isVerified: ann.isVerified
      })
    );

    return {
      output: { annotations },
      message: `Retrieved **${annotations.length}** annotation(s) for document \`${ctx.input.documentIdentifier}\`.`
    };
  })
  .build();

export let batchUpdateAnnotations = SlateTool.create(spec, {
  name: 'Batch Update Annotations',
  key: 'batch_update_annotations',
  description: `Update multiple document annotations in a single request. Use this to programmatically correct or confirm extracted data points. Each update specifies an annotation ID and the new values to set.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      updates: z
        .array(
          z.object({
            annotationId: z.number().describe('ID of the annotation to update.'),
            parsedValue: z.any().optional().describe('New parsed value for the annotation.'),
            isVerified: z
              .boolean()
              .optional()
              .describe('Set to true to mark the annotation as verified.'),
            validationResults: z
              .array(z.any())
              .optional()
              .describe('Validation results to attach to the annotation.')
          })
        )
        .describe('List of annotation updates to apply.')
    })
  )
  .output(
    z.object({
      updatedCount: z.number().describe('Number of annotations successfully updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let updates = ctx.input.updates.map(u => {
      let update: Record<string, any> = { id: u.annotationId };
      if (u.parsedValue !== undefined) update.parsed = u.parsedValue;
      if (u.isVerified !== undefined) update.isVerified = u.isVerified;
      if (u.validationResults) update.validationResults = u.validationResults;
      return update;
    });

    await client.batchUpdateAnnotations(updates);

    return {
      output: {
        updatedCount: ctx.input.updates.length
      },
      message: `Updated **${ctx.input.updates.length}** annotation(s).`
    };
  })
  .build();
