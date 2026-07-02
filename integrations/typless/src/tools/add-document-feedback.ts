import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addDocumentFeedback = SlateTool.create(spec, {
  name: 'Add Document Feedback',
  key: 'add_document_feedback',
  description: `Submit corrected field values for a previously extracted document to enable continuous learning. Uses the object ID returned from extraction along with verified field name-value pairs to improve future extraction accuracy. This feedback mechanism allows Typless to learn incrementally from every human validation.`,
  instructions: [
    'Use the objectId returned from the Extract Document tool as the documentObjectId',
    'Provide all corrected field values as name-value pairs in learningFields',
    'Date values should be in YYYY-MM-DD format, numbers in decimal format'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentTypeName: z
        .string()
        .describe('Slug/name of the document type used during extraction'),
      documentObjectId: z.string().describe('Object ID returned from the extraction result'),
      learningFields: z
        .array(
          z.object({
            name: z
              .string()
              .describe(
                'Name of the field (e.g. "supplier_name", "total_amount", "issue_date")'
              ),
            value: z.string().describe('Corrected/verified value for the field')
          })
        )
        .describe('List of field name-value pairs with corrected data')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was submitted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.addDocumentFeedback({
      documentTypeName: ctx.input.documentTypeName,
      documentObjectId: ctx.input.documentObjectId,
      learningFields: ctx.input.learningFields
    });

    let fieldNames = ctx.input.learningFields.map(f => f.name).join(', ');

    return {
      output: { success: true },
      message: `Feedback submitted for document **${ctx.input.documentObjectId}** with ${ctx.input.learningFields.length} corrected fields: ${fieldNames}`
    };
  })
  .build();
