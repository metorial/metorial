import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDocument = SlateTool.create(spec, {
  name: 'Get Document',
  key: 'get_document',
  description: `Retrieve detailed information about a specific document including its status, signer details, form field values, sender information, and activity history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The ID of the document to retrieve')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      messageTitle: z.string().optional().describe('Document title'),
      documentDescription: z.string().optional().describe('Document description'),
      status: z.string().optional().describe('Current document status'),
      senderDetail: z.record(z.string(), z.any()).optional().describe('Sender information'),
      signerDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Signer information including status and form fields'),
      ccDetails: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('CC recipient details'),
      brandId: z.string().optional().describe('Associated brand ID'),
      labels: z.array(z.string()).optional().describe('Document tags/labels'),
      createdDate: z.number().optional().describe('Creation timestamp'),
      activityDate: z.number().optional().describe('Last activity timestamp'),
      expiryDate: z.number().optional().describe('Expiry timestamp'),
      enableSigningOrder: z.boolean().optional().describe('Whether signing order is enforced')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getDocument(ctx.input.documentId);

    return {
      output: {
        documentId: result.documentId,
        messageTitle: result.messageTitle,
        documentDescription: result.documentDescription,
        status: result.status,
        senderDetail: result.senderDetail,
        signerDetails: result.signerDetails,
        ccDetails: result.ccDetails,
        brandId: result.brandId,
        labels: result.labels,
        createdDate: result.createdDate,
        activityDate: result.activityDate,
        expiryDate: result.expiryDate,
        enableSigningOrder: result.enableSigningOrder
      },
      message: `Document **${result.messageTitle ?? result.documentId}** — Status: **${result.status}**`
    };
  })
  .build();
