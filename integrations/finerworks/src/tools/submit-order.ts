import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  firstName: z.string().describe('Recipient first name'),
  lastName: z.string().describe('Recipient last name'),
  companyName: z.string().optional().describe('Company name'),
  address1: z.string().describe('Primary address line'),
  address2: z.string().optional().describe('Secondary address line'),
  address3: z.string().optional().describe('Tertiary address line'),
  city: z.string().describe('City'),
  stateCode: z.string().optional().describe('State/province code (e.g., "TX", "CA")'),
  province: z.string().optional().describe('Province name (for non-US addresses)'),
  zipPostalCode: z.string().describe('Postal/ZIP code'),
  countryCode: z.string().describe('Country code (e.g., "us", "ca", "gb")'),
  phone: z.string().optional().describe('Contact phone number'),
  email: z.string().optional().describe('Contact email address')
});

let orderItemSchema = z.object({
  productSku: z.string().describe('Virtual inventory SKU or product code'),
  productQty: z.number().int().min(1).describe('Quantity to order'),
  productTitle: z.string().optional().describe('Product name/title for the packing slip'),
  productImage: z.string().optional().describe('Image URL reference for the product'),
  productGuid: z.string().optional().describe('Product GUID identifier'),
  productOrderPo: z.string().optional().describe('Line item purchase order reference'),
  customData1: z.string().optional().describe('Custom data field 1'),
  customData2: z.string().optional().describe('Custom data field 2'),
  customData3: z.string().optional().describe('Custom data field 3')
});

let orderSchema = z.object({
  orderPo: z.string().describe('Purchase order reference identifier'),
  recipient: recipientSchema.describe('Recipient/shipping address'),
  orderItems: z.array(orderItemSchema).min(1).describe('Line items in the order'),
  shippingCode: z
    .string()
    .describe(
      'Shipping method code (e.g., "SD" for standard, "EC" for economy, "FS" for FedEx)'
    ),
  shipByDate: z.string().optional().describe('Optional ship-by deadline (ISO 8601 date)'),
  giftMessage: z.string().optional().describe('Optional gift message for the packing slip'),
  webhookOrderStatusUrl: z
    .string()
    .optional()
    .describe('Callback URL for receiving order status updates'),
  documentUrl: z
    .string()
    .optional()
    .describe('Optional document reference URL (max 200 chars)'),
  acctNumberUps: z.string().optional().describe('Custom UPS account number'),
  acctNumberFedex: z.string().optional().describe('Custom FedEx account number'),
  customsTaxInfo: z.string().optional().describe('International customs/tax information'),
  customData1: z.string().optional().describe('Custom data field 1 (max 255 chars)'),
  customData2: z.string().optional().describe('Custom data field 2 (max 255 chars)'),
  customData3: z.string().optional().describe('Custom data field 3 (max 255 chars)')
});

export let submitOrder = SlateTool.create(spec, {
  name: 'Submit Orders',
  key: 'submit_orders',
  description: `Submit print-on-demand orders to FinerWorks for fulfillment. Supports submitting up to 5 orders at a time, each with recipient shipping information, line items referencing product SKUs, and shipping method. Optionally validate orders without submitting by setting \`validateOnly\` to true.`,
  constraints: [
    'Maximum of 5 orders per submission',
    'Each order requires at least one line item with a valid product SKU'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      orders: z.array(orderSchema).min(1).max(5).describe('Orders to submit (1-5)'),
      validateOnly: z
        .boolean()
        .optional()
        .describe('Set to true to validate orders without actually submitting them')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the submission was successful'),
      message: z.string().optional().describe('Status message from the API'),
      orders: z
        .array(
          z.object({
            orderPo: z.string().describe('Original purchase order reference'),
            orderId: z.number().describe('System-assigned order ID'),
            orderConfirmationId: z.number().describe('Confirmation reference number'),
            orderConfirmationDatetime: z
              .string()
              .optional()
              .describe('Timestamp of confirmation')
          })
        )
        .optional()
        .describe('Successfully submitted orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let apiOrders = ctx.input.orders.map(order => ({
      order_po: order.orderPo,
      recipient: {
        first_name: order.recipient.firstName,
        last_name: order.recipient.lastName,
        company_name: order.recipient.companyName ?? null,
        address_1: order.recipient.address1,
        address_2: order.recipient.address2 ?? null,
        address_3: order.recipient.address3 ?? null,
        city: order.recipient.city,
        state_code: order.recipient.stateCode ?? '',
        province: order.recipient.province ?? null,
        zip_postal_code: order.recipient.zipPostalCode,
        country_code: order.recipient.countryCode,
        phone: order.recipient.phone ?? '',
        email: order.recipient.email ?? null,
        address_order_po: order.orderPo
      },
      order_items: order.orderItems.map(item => ({
        product_sku: item.productSku,
        product_qty: item.productQty,
        product_title: item.productTitle ?? '',
        product_image: item.productImage ?? null,
        product_guid: item.productGuid ?? '',
        product_order_po: item.productOrderPo ?? order.orderPo,
        custom_data_1: item.customData1 ?? null,
        custom_data_2: item.customData2 ?? null,
        custom_data_3: item.customData3 ?? null
      })),
      shipping_code: order.shippingCode,
      ship_by_date: order.shipByDate ?? null,
      gift_message: order.giftMessage ?? null,
      webhook_order_status_url: order.webhookOrderStatusUrl ?? null,
      document_url: order.documentUrl ?? null,
      acct_number_ups: order.acctNumberUps ?? null,
      acct_number_fedex: order.acctNumberFedex ?? null,
      customs_tax_info: order.customsTaxInfo ?? null,
      custom_data_1: order.customData1 ?? null,
      custom_data_2: order.customData2 ?? null,
      custom_data_3: order.customData3 ?? null,
      test_mode: ctx.config.testMode ?? false
    }));

    let data = await client.submitOrders(apiOrders, ctx.input.validateOnly);

    let resultOrders = (data.orders ?? []).map((o: any) => ({
      orderPo: o.order_po ?? '',
      orderId: o.order_id ?? 0,
      orderConfirmationId: o.order_confirmation_id ?? 0,
      orderConfirmationDatetime: o.order_confirmation_datetime ?? undefined
    }));

    let output = {
      success: data.status?.success ?? false,
      message: data.status?.message || undefined,
      orders: resultOrders
    };

    let action = ctx.input.validateOnly ? 'validated' : 'submitted';
    let orderCount = resultOrders.length;

    return {
      output,
      message: output.success
        ? `Successfully ${action} **${orderCount}** order(s). ${resultOrders.map((o: any) => `Order \`${o.orderPo}\` → ID: ${o.orderId}`).join(', ')}`
        : `Order submission failed: ${output.message ?? 'Unknown error'}`
    };
  })
  .build();
