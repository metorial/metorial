import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdfApiIoServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  outputOptionForDelivery,
  pdfAttachments,
  pdfDeliverySchema,
  pdfOutput,
  pdfOutputSchema,
  requireNonEmptyString
} from './shared';

export let mergeTemplates = SlateTool.create(spec, {
  name: 'Merge Templates',
  key: 'merge_templates',
  description: `Combine multiple PDF templates into a single PDF document. Each template receives its own set of dynamic data. Useful for generating multi-section documents such as an invoice combined with a shipping label in one API call. Returns either a Slate PDF attachment or a temporary download URL.`,
  instructions: [
    'Provide at least two templates to merge.',
    'Each template entry requires its own template ID and data object with the appropriate variables.',
    'Use outputFormat="attachment" when you need the generated PDF file bytes. The file is returned as a Slate attachment, not inline base64.'
  ],
  constraints: [
    'Rate limit: 60 requests per minute by default.',
    'Temporary download URLs expire after 15 minutes.'
  ]
})
  .input(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('ID of the template to include in the merged PDF'),
            templateData: z
              .record(z.string(), z.unknown())
              .describe("Key-value pairs matching this template's variables")
          })
        )
        .describe('Array of at least two templates to merge, each with its own dynamic data'),
      outputFormat: pdfDeliverySchema
    })
  )
  .output(
    pdfOutputSchema.extend({
      templateCount: z.number().describe('Number of templates included in the merge')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.templates.length < 2) {
      throw pdfApiIoServiceError('merge_templates requires at least two template entries.');
    }

    let mergeEntries = ctx.input.templates.map(t => ({
      id: requireNonEmptyString(t.templateId, 'templateId'),
      data: t.templateData
    }));

    let result = await client.mergeTemplates(mergeEntries, {
      output: outputOptionForDelivery(ctx.input.outputFormat)
    });

    let output = {
      templateCount: ctx.input.templates.length,
      ...pdfOutput(result)
    };

    return {
      output,
      attachments: pdfAttachments(result),
      message: `Merged **${ctx.input.templates.length}** template(s) into a single PDF. ${
        output.delivery === 'url'
          ? 'Download URL provided (expires in 15 minutes).'
          : `Returned as a Slate attachment (${output.byteLength} bytes).`
      }`
    };
  })
  .build();
