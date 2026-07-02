import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

let agreementEntrySchema = z.object({
  productId: z.number().optional().describe('Product ID'),
  productCode: z.string().optional().describe('Product code'),
  productName: z.string().optional().describe('Product/service name'),
  quantity: z.number().describe('Quantity'),
  unit: z.string().optional().describe('Unit of measure'),
  unitNetPrice: z.number().describe('Net price per unit'),
  vatPercent: z.number().optional().describe('VAT percentage')
});

export let createAgreement = SlateTool.create(spec, {
  name: 'Create Agreement',
  key: 'create_agreement',
  description: `Create a new agreement (contract) document in Firmao. Agreements support line items, customer linkage, pricing, and status tracking.`
})
  .input(
    z.object({
      number: z.string().describe('Unique agreement number'),
      mode: z.enum(['SALE', 'PURCHASE']).describe('Sale or purchase mode'),
      customerId: z.number().optional().describe('Customer ID'),
      currency: z.string().optional().describe('Currency code'),
      offerStatus: z
        .enum(['NEW', 'SENT', 'DURING_NEGOTIATIONS', 'ACCEPTED', 'REJECTED', 'EXECUTED'])
        .optional()
        .describe('Agreement status'),
      entries: z.array(agreementEntrySchema).optional().describe('Line items'),
      paymentType: z.string().optional().describe('Payment type (CASH, TRANSFER)'),
      nipNumber: z.string().optional().describe('Customer NIP number')
    })
  )
  .output(
    z.object({
      agreementId: z.number().describe('ID of the created agreement'),
      number: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      number: ctx.input.number,
      mode: ctx.input.mode
    };

    if (ctx.input.customerId !== undefined) body.customer = ctx.input.customerId;
    if (ctx.input.currency) body.currency = ctx.input.currency;
    if (ctx.input.offerStatus) body.offerStatus = ctx.input.offerStatus;
    if (ctx.input.paymentType) body.paymentType = ctx.input.paymentType;
    if (ctx.input.nipNumber) body.nipNumber = ctx.input.nipNumber;
    if (ctx.input.entries) {
      body.entries = ctx.input.entries.map(e => ({
        product: e.productId,
        productCode: e.productCode,
        productName: e.productName,
        quantity: e.quantity,
        unit: e.unit,
        unitNettoPrice: e.unitNetPrice,
        vatPercent: e.vatPercent
      }));
    }

    let result = await client.create('agreements', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        agreementId: createdId,
        number: ctx.input.number
      },
      message: `Created agreement **${ctx.input.number}** (ID: ${createdId}).`
    };
  })
  .build();
