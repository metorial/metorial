import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let paymentSetting = z.looseObject({
  id: z.number().nullable().optional().describe('Identifier of this payment option'),
  payment_address: z
    .string()
    .nullable()
    .optional()
    .describe(
      'Account address the payments are sent to, where the payment type uses one such as PayPal'
    ),
  payment_type: z
    .string()
    .nullable()
    .optional()
    .describe('Payment method this option uses, for example a card gateway or PayPal')
});

export let listPaymentSettings = SlateTool.create(spec, {
  name: 'List Payment Settings',
  key: 'list_payment_settings',
  description: `List the payment options configured for a property, each with its identifier, payment type, and the account address payments are sent to. Lodgify describes these payment options as relevant when creating a booking, so use this to find out how a property can collect payment before you create a booking that should be paid online.`,
  instructions: [
    'Call this before create_booking to see which payment options a property has configured. Lodgify does not document the id returned here as the payment website ID that create_booking accepts, so confirm the gateway identifier before relying on it for a real booking.',
    'If a property returns no payment options, it has no online payment gateway configured and bookings for it cannot select one.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The ID of the property to list payment options for')
    })
  )
  .output(
    z.object({
      paymentSettings: z
        .array(paymentSetting)
        .describe(
          'Payment options available for the property, each with its identifier, payment type, and payment address'
        ),
      count: z.number().describe('Number of payment options returned'),
      propertyId: z.number().describe('The property the payment options belong to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listPropertyPaymentSettings(ctx.input.propertyId);

    let paymentSettings = Array.isArray(result) ? result : [];

    if (paymentSettings.length === 0) {
      return {
        output: { paymentSettings, count: 0, propertyId: ctx.input.propertyId },
        message: `No payment options are configured for property **#${ctx.input.propertyId}**.`
      };
    }

    let preview = paymentSettings
      .map(
        (setting: any) => `**${setting?.payment_type ?? 'Unknown type'}** (ID ${setting?.id})`
      )
      .join(', ');

    return {
      output: {
        paymentSettings,
        count: paymentSettings.length,
        propertyId: ctx.input.propertyId
      },
      message: `Found **${paymentSettings.length}** payment options for property **#${ctx.input.propertyId}**: ${preview}.`
    };
  })
  .build();
