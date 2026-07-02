import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitDocument = SlateTool.create(spec, {
  name: 'Submit PDF to Print Queue',
  key: 'submit_document',
  description: `Uploads a base64-encoded PDF document to a PrintAutopilot print queue for automated physical printing. The document will be picked up by the PrintAutopilot Windows client installed on the machine with the connected printer.

Use this to automate printing of packing slips, shipping labels, invoices, or any other PDF documents.`,
  instructions: [
    'The PDF content must be provided as a base64-encoded string.',
    'Each print queue has its own token — use the correct print queue token for the target printer/queue.'
  ],
  constraints: ['Only PDF documents are supported.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      printQueueToken: z
        .string()
        .describe(
          'API token for the target print queue. Each queue has its own unique token, found in your PrintAutopilot dashboard.'
        ),
      fileName: z
        .string()
        .describe('Name for the document in the print queue (e.g. "invoice-1234.pdf").'),
      base64Content: z
        .string()
        .describe('Base64-encoded content of the PDF document to print.')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe('Whether the document was successfully submitted to the queue.'),
      rawResponse: z.any().optional().describe('Raw response from the PrintAutopilot API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.progress('Submitting PDF document to print queue...');

    let response = await client.addDocumentToQueue({
      printQueueToken: ctx.input.printQueueToken,
      fileName: ctx.input.fileName,
      base64Content: ctx.input.base64Content
    });

    return {
      output: {
        success: true,
        rawResponse: response
      },
      message: `Successfully submitted **${ctx.input.fileName}** to the print queue.`
    };
  })
  .build();
