import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let generatePdf = SlateTool.create(spec, {
  name: 'Generate PDF',
  key: 'generate_pdf',
  description: `Generate a PDF document from a record in EspoCRM using a PDF template. Templates are configured in the EspoCRM admin panel under PDF Templates.`,
  instructions: [
    'A PDF template must be created in EspoCRM before using this tool.',
    'Use the list_records tool with entityType "Template" to find available template IDs.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      entityType: z
        .string()
        .describe('Entity type of the record (e.g., Quote, Invoice, Account, Contact)'),
      recordId: z.string().describe('ID of the record to generate PDF from'),
      templateId: z.string().describe('ID of the PDF template to use')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether PDF generation succeeded'),
      attachmentId: z.string().optional().describe('ID of the generated PDF attachment')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.generatePdf(
      ctx.input.entityType,
      ctx.input.recordId,
      ctx.input.templateId
    );

    return {
      output: {
        success: true,
        attachmentId: result.id || result.attachmentId
      },
      message: `PDF generated from ${ctx.input.entityType} **${ctx.input.recordId}** using template **${ctx.input.templateId}**.`
    };
  })
  .build();
