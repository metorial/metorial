import { SlateTool } from 'slates';
import { z } from 'zod';
import { SpondyrClient } from '../lib/client';
import { spec } from '../spec';

export let createCorrespondence = SlateTool.create(spec, {
  name: 'Create Correspondence',
  key: 'create_correspondence',
  description: `Generate and optionally deliver correspondence through Spondyr. Submits JSON transaction data that is merged with matching templates to produce documents (PDF or HTML). Set **generateOnly** to \`true\` to defer delivery — you can trigger delivery later using the Deliver Correspondence tool.`,
  instructions: [
    'Use the List Transaction Types tool first to discover available transaction types and event types.',
    'The transactionData object should contain fields that map to your Spondyr template placeholders.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      transactionType: z
        .string()
        .describe('The transaction type that determines which templates apply'),
      eventType: z.string().describe('The event type within the transaction type'),
      generateOnly: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'When true, generates the correspondence but defers delivery until a separate Deliver call is made'
        ),
      transactionData: z
        .record(z.string(), z.unknown())
        .describe('JSON data that maps to template fields for document generation')
    })
  )
  .output(
    z.object({
      referenceId: z.string().describe('Unique reference ID for tracking this correspondence'),
      apiStatus: z.string().describe('API response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SpondyrClient({
      token: ctx.auth.token,
      applicationToken: ctx.auth.applicationToken
    });

    let result = await client.createCorrespondence({
      transactionType: ctx.input.transactionType,
      eventType: ctx.input.eventType,
      isGenerateOnly: ctx.input.generateOnly,
      transactionData: ctx.input.transactionData
    });

    let mode = ctx.input.generateOnly
      ? 'generated (delivery deferred)'
      : 'generated and queued for delivery';

    return {
      output: {
        referenceId: result.referenceId,
        apiStatus: result.apiStatus
      },
      message: `Correspondence ${mode}. Reference ID: **${result.referenceId}**, Status: **${result.apiStatus}**.`
    };
  })
  .build();
