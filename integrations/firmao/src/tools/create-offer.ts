import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

let offerEntrySchema = z.object({
  productId: z.number().optional().describe('Product ID'),
  productCode: z.string().optional().describe('Product code'),
  productName: z.string().optional().describe('Product/service name'),
  quantity: z.number().describe('Quantity'),
  unit: z.string().optional().describe('Unit of measure'),
  unitNetPrice: z.number().describe('Net price per unit'),
  vatPercent: z.number().optional().describe('VAT percentage'),
  classificationNumber: z.string().optional().describe('Classification number')
});

export let createOffer = SlateTool.create(spec, {
  name: 'Create Offer or Order',
  key: 'create_offer',
  description: `Create a new offer or order document in Firmao. Supports line items with products, pricing, customer details, and status tracking. Both sales and purchase modes are available.`
})
  .input(
    z.object({
      type: z.enum(['OFFER', 'ORDER']).describe('Document type - offer or order'),
      mode: z.enum(['SALE', 'PURCHASE']).describe('Sale or purchase mode'),
      number: z.string().describe('Unique document number'),
      offerDate: z.string().optional().describe('Document date (YYYY-MM-DD)'),
      validFrom: z.string().optional().describe('Valid from date (YYYY-MM-DD)'),
      paymentDate: z.string().optional().describe('Payment due date (YYYY-MM-DD)'),
      currency: z.string().optional().describe('Currency code (e.g., PLN, EUR, USD)'),
      customerId: z.number().optional().describe('Customer ID'),
      issuingPerson: z.string().optional().describe('Name of the person issuing the document'),
      paymentType: z.string().optional().describe('Payment method (CASH, TRANSFER)'),
      offerStatus: z
        .enum(['NEW', 'SENT', 'DURING_NEGOTIATIONS', 'ACCEPTED', 'REJECTED', 'EXECUTED'])
        .optional()
        .describe('Document status'),
      daysToDueDate: z.number().optional().describe('Days until due date'),
      entries: z.array(offerEntrySchema).describe('Line items'),
      nipNumber: z.string().optional().describe('Customer NIP number'),
      customerStreet: z.string().optional().describe('Customer street'),
      customerCity: z.string().optional().describe('Customer city'),
      customerPostCode: z.string().optional().describe('Customer post code'),
      customerCountry: z.string().optional().describe('Customer country')
    })
  )
  .output(
    z.object({
      offerId: z.number().describe('ID of the created offer/order'),
      number: z.string(),
      type: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      type: ctx.input.type,
      mode: ctx.input.mode,
      number: ctx.input.number,
      entries: ctx.input.entries.map(e => ({
        product: e.productId,
        productCode: e.productCode,
        productName: e.productName,
        quantity: e.quantity,
        unit: e.unit,
        unitNettoPrice: e.unitNetPrice,
        vatPercent: e.vatPercent,
        classificationNumber: e.classificationNumber
      }))
    };

    if (ctx.input.offerDate) body.offerDate = ctx.input.offerDate;
    if (ctx.input.validFrom) body.validFrom = ctx.input.validFrom;
    if (ctx.input.paymentDate) body.paymentDate = ctx.input.paymentDate;
    if (ctx.input.currency) body.currency = ctx.input.currency;
    if (ctx.input.customerId !== undefined) body.customer = ctx.input.customerId;
    if (ctx.input.issuingPerson) body.issuingPerson = ctx.input.issuingPerson;
    if (ctx.input.paymentType) body.paymentType = ctx.input.paymentType;
    if (ctx.input.offerStatus) body.offerStatus = ctx.input.offerStatus;
    if (ctx.input.daysToDueDate !== undefined) body.daysToDueDate = ctx.input.daysToDueDate;
    if (ctx.input.nipNumber) body.nipNumber = ctx.input.nipNumber;
    if (ctx.input.customerStreet) body['customerAddress.street'] = ctx.input.customerStreet;
    if (ctx.input.customerCity) body['customerAddress.city'] = ctx.input.customerCity;
    if (ctx.input.customerPostCode)
      body['customerAddress.postCode'] = ctx.input.customerPostCode;
    if (ctx.input.customerCountry) body['customerAddress.country'] = ctx.input.customerCountry;

    let result = await client.create('offers', body);
    let createdId = result?.changelog?.[0]?.objectId ?? result?.id;

    return {
      output: {
        offerId: createdId,
        number: ctx.input.number,
        type: ctx.input.type
      },
      message: `Created ${ctx.input.type.toLowerCase()} **${ctx.input.number}** (ID: ${createdId}).`
    };
  })
  .build();
