import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getOrderTool = SlateTool.create(spec, {
  name: 'Get Order',
  key: 'get_order',
  description: `Retrieve detailed information about a specific order by its ID, including buyer details and invoice information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.number().describe('Event ID the order belongs to'),
      orderId: z.string().describe('Unique order identifier')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique order identifier'),
      eventId: z.number().describe('Associated event ID'),
      orderDate: z.string().describe('Order creation date'),
      orderStatus: z.string().describe('Order status'),
      updatedDate: z.string().describe('Last update date'),
      discountCode: z.string().describe('Discount code used, if any'),
      transactionType: z.string().describe('Transaction type'),
      totalSalePrice: z.number().describe('Total sale price of the order'),
      buyerFirstName: z.string().describe('Buyer first name'),
      buyerLastName: z.string().describe('Buyer last name'),
      buyerEmail: z.string().describe('Buyer email address'),
      invoiceInfo: z
        .object({
          docType: z.string().describe('Document type'),
          docNumber: z.string().describe('Document number'),
          clientName: z.string().describe('Client name on invoice'),
          zipCode: z.string().describe('Invoice address ZIP code'),
          street: z.string().describe('Invoice address street'),
          streetNumber: z.string().describe('Invoice address street number'),
          street2: z.string().describe('Invoice address complement'),
          neighborhood: z.string().describe('Invoice address neighborhood'),
          city: z.string().describe('Invoice address city'),
          state: z.string().describe('Invoice address state')
        })
        .describe('Invoice information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let o = await client.getOrder(ctx.input.eventId, ctx.input.orderId);

    let output = {
      orderId: o.id ?? '',
      eventId: o.event_id ?? 0,
      orderDate: o.order_date ?? '',
      orderStatus: o.order_status ?? '',
      updatedDate: o.updated_date ?? '',
      discountCode: o.discount_code ?? '',
      transactionType: o.transaction_type ?? '',
      totalSalePrice: o.order_total_sale_price ?? 0,
      buyerFirstName: o.buyer_first_name ?? '',
      buyerLastName: o.buyer_last_name ?? '',
      buyerEmail: o.buyer_email ?? '',
      invoiceInfo: {
        docType: o.invoice_info?.doc_type ?? '',
        docNumber: o.invoice_info?.doc_number ?? '',
        clientName: o.invoice_info?.client_name ?? '',
        zipCode: o.invoice_info?.address_zip_code ?? '',
        street: o.invoice_info?.address_street ?? '',
        streetNumber: o.invoice_info?.address_street_number ?? '',
        street2: o.invoice_info?.address_street2 ?? '',
        neighborhood: o.invoice_info?.address_neighborhood ?? '',
        city: o.invoice_info?.address_city ?? '',
        state: o.invoice_info?.address_state ?? ''
      }
    };

    return {
      output,
      message: `Retrieved order **${output.orderId}** by ${output.buyerFirstName} ${output.buyerLastName} (${output.orderStatus}).`
    };
  })
  .build();
