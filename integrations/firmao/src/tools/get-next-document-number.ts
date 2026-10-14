import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

let documentTypes: Record<string, readonly string[]> = {
  transaction: [
    'invoice',
    'receipt',
    'proforma',
    'correction',
    'bill',
    'invoicemargin',
    'advance_invoice'
  ],
  offer: ['offer', 'order'],
  agreement: ['agreement'],
  storagedoc: [
    'outside_income',
    'outside_release',
    'inside_release',
    'inside_income',
    'warehouse_transfer'
  ]
};

export let getNextDocumentNumber = SlateTool.create(spec, {
  name: 'Get Next Document Number',
  key: 'get_next_document_number',
  description:
    'Retrieve the next suggested document number from a Firmao numbering series. Call list_numbering_series to discover the series ID. The number must still be unique when the document is created.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      seriesId: z
        .number()
        .int()
        .positive()
        .describe('Numbering series ID from list_numbering_series'),
      objectClass: z
        .enum(['transaction', 'offer', 'agreement', 'storagedoc'])
        .describe('Document object class'),
      type: z
        .enum([
          'invoice',
          'receipt',
          'proforma',
          'correction',
          'bill',
          'invoicemargin',
          'advance_invoice',
          'offer',
          'order',
          'agreement',
          'outside_income',
          'outside_release',
          'inside_release',
          'inside_income',
          'warehouse_transfer'
        ])
        .describe('Document type belonging to the selected object class'),
      mode: z.enum(['SALE', 'PURCHASE']).describe('Sales or purchase numbering')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Firmao response containing the suggested document number')
    })
  )
  .handleInvocation(async ctx => {
    let allowedTypes = documentTypes[ctx.input.objectClass] ?? [];
    if (!allowedTypes.includes(ctx.input.type)) {
      throw createApiServiceError(
        `Document class ${ctx.input.objectClass} supports these types: ${allowedTypes.join(', ')}.`
      );
    }
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });
    let result = await client.getNextNumber(
      ctx.input.objectClass,
      ctx.input.type,
      ctx.input.mode,
      ctx.input.seriesId
    );
    return {
      output: { result },
      message: 'Retrieved the next suggested document number.'
    };
  })
  .build();
