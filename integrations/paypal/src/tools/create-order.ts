import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new PayPal checkout order. Supports both immediate capture and authorization-then-capture flows. Can include one or more purchase units, each with its own amount, items, and shipping details. Returns an approval URL for the buyer to complete payment.`,
  instructions: [
    'Set **intent** to "CAPTURE" for immediate payment or "AUTHORIZE" to capture later.',
    'Each purchase unit requires an **amount** with currency_code and value.',
    'Items are optional but recommended for better buyer experience.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      intent: z
        .enum(['CAPTURE', 'AUTHORIZE'])
        .describe(
          'Payment intent: CAPTURE for immediate payment, AUTHORIZE for deferred capture'
        ),
      purchaseUnits: z
        .array(
          z.object({
            referenceId: z
              .string()
              .optional()
              .describe('Unique reference ID for this purchase unit'),
            currencyCode: z
              .string()
              .describe('Three-character ISO-4217 currency code (e.g. USD, EUR)'),
            amount: z.string().describe('Total order amount as a string (e.g. "100.00")'),
            description: z.string().optional().describe('Description of the purchase'),
            items: z
              .array(
                z.object({
                  name: z.string().describe('Item name'),
                  quantity: z.string().describe('Item quantity as a string'),
                  unitAmount: z.string().describe('Item unit price as a string'),
                  currencyCode: z.string().describe('Currency code for the item price'),
                  description: z.string().optional().describe('Item description'),
                  category: z
                    .enum(['DIGITAL_GOODS', 'PHYSICAL_GOODS', 'DONATION'])
                    .optional()
                    .describe('Item category')
                })
              )
              .optional()
              .describe('Line items in this purchase unit'),
            shipping: z
              .object({
                name: z.string().optional().describe('Shipping recipient name'),
                addressLine1: z.string().optional().describe('Street address line 1'),
                addressLine2: z.string().optional().describe('Street address line 2'),
                city: z.string().optional().describe('City'),
                state: z.string().optional().describe('State or province'),
                postalCode: z.string().optional().describe('Postal/ZIP code'),
                countryCode: z.string().optional().describe('Two-character ISO country code')
              })
              .optional()
              .describe('Shipping information')
          })
        )
        .min(1)
        .describe('One or more purchase units for the order'),
      returnUrl: z.string().optional().describe('URL to redirect the buyer after approval'),
      cancelUrl: z.string().optional().describe('URL to redirect the buyer after cancellation')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('PayPal order ID'),
      status: z.string().describe('Order status'),
      approvalUrl: z.string().optional().describe('URL for the buyer to approve the order'),
      links: z
        .array(
          z.object({
            href: z.string(),
            rel: z.string(),
            method: z.string().optional()
          })
        )
        .optional()
        .describe('HATEOAS links for the order')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let purchaseUnits = ctx.input.purchaseUnits.map(pu => {
      let unit: Record<string, any> = {
        amount: {
          currency_code: pu.currencyCode,
          value: pu.amount
        }
      };
      if (pu.referenceId) unit.reference_id = pu.referenceId;
      if (pu.description) unit.description = pu.description;

      if (pu.items) {
        unit.items = pu.items.map(item => {
          let i: Record<string, any> = {
            name: item.name,
            quantity: item.quantity,
            unit_amount: { currency_code: item.currencyCode, value: item.unitAmount }
          };
          if (item.description) i.description = item.description;
          if (item.category) i.category = item.category;
          return i;
        });
        // When items are present, we need an item_total in the breakdown
        let itemTotal = pu.items.reduce(
          (sum, item) =>
            sum + Number.parseFloat(item.unitAmount) * Number.parseInt(item.quantity, 10),
          0
        );
        unit.amount.breakdown = {
          item_total: { currency_code: pu.currencyCode, value: itemTotal.toFixed(2) }
        };
      }

      if (pu.shipping) {
        let shipping: Record<string, any> = {};
        if (pu.shipping.name) shipping.name = { full_name: pu.shipping.name };
        let address: Record<string, any> = {};
        if (pu.shipping.addressLine1) address.address_line_1 = pu.shipping.addressLine1;
        if (pu.shipping.addressLine2) address.address_line_2 = pu.shipping.addressLine2;
        if (pu.shipping.city) address.admin_area_2 = pu.shipping.city;
        if (pu.shipping.state) address.admin_area_1 = pu.shipping.state;
        if (pu.shipping.postalCode) address.postal_code = pu.shipping.postalCode;
        if (pu.shipping.countryCode) address.country_code = pu.shipping.countryCode;
        if (Object.keys(address).length > 0) shipping.address = address;
        if (Object.keys(shipping).length > 0) unit.shipping = shipping;
      }

      return unit;
    });

    let applicationContext: Record<string, any> | undefined;
    if (ctx.input.returnUrl || ctx.input.cancelUrl) {
      applicationContext = {};
      if (ctx.input.returnUrl) applicationContext.return_url = ctx.input.returnUrl;
      if (ctx.input.cancelUrl) applicationContext.cancel_url = ctx.input.cancelUrl;
    }

    let order = await client.createOrder({
      intent: ctx.input.intent,
      purchaseUnits: purchaseUnits as any,
      applicationContext
    });

    let links = (order.links as Array<{ href: string; rel: string; method?: string }>) || [];
    let approvalLink = links.find(l => l.rel === 'approve');

    return {
      output: {
        orderId: order.id,
        status: order.status,
        approvalUrl: approvalLink?.href,
        links: links.map(l => ({ href: l.href, rel: l.rel, method: l.method }))
      },
      message: `Created order \`${order.id}\` with status **${order.status}**. ${approvalLink ? `Approval URL: ${approvalLink.href}` : ''}`
    };
  })
  .build();
