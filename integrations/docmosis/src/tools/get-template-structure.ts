import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplateStructure = SlateTool.create(spec, {
  name: 'Get Template Structure',
  key: 'get_template_structure',
  description: `Analyze a template to retrieve its field structure, sections, and conditions. Also returns sample data showing the expected data shape for rendering.
Use this to understand what data a template expects before calling the render endpoint.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateName: z
        .string()
        .describe(
          'Path to the template in Docmosis Cloud (e.g., "/invoices/invoice-template.docx")'
        )
    })
  )
  .output(
    z.object({
      succeeded: z.boolean().describe('Whether the operation succeeded'),
      structure: z
        .record(z.string(), z.any())
        .optional()
        .describe('Template structure including fields, sections, and conditions'),
      sampleData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Sample data object showing the expected data shape for this template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let [structureResult, sampleDataResult] = await Promise.all([
      client.getTemplateStructure(ctx.input.templateName),
      client.getSampleData(ctx.input.templateName)
    ]);

    let succeeded = structureResult.succeeded && sampleDataResult.succeeded;

    let message = succeeded
      ? `Retrieved structure and sample data for template \`${ctx.input.templateName}\`.`
      : `Failed to analyze template: ${structureResult.shortMsg || sampleDataResult.shortMsg || 'Unknown error'}`;

    return {
      output: {
        succeeded,
        structure: structureResult.structure,
        sampleData: sampleDataResult.sampleData
      },
      message
    };
  })
  .build();
