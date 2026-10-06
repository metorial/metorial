import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { invalid, required } from '../lib/native';
import { spec } from '../spec';

export let orderPhoneNumbers = SlateTool.create(spec, {
  name: 'Order Phone Numbers',
  key: 'order_phone_numbers',
  description: `Purchase one or more phone numbers. Phone numbers should first be found using the Search Available Phone Numbers tool. Provide the exact E.164 formatted numbers to order.`,
  instructions: [
    'Use the Search Available Phone Numbers tool first to find numbers, then pass the exact phone number strings here.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get'])
        .default('create')
        .describe('Purchase numbers or read the exact asynchronous order status'),
      orderId: z.string().optional().describe('Required for get'),
      phoneNumbers: z
        .array(z.string())
        .min(1)
        .optional()
        .describe('Array of phone numbers to order in E.164 format')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique ID of the number order'),
      status: z.string().nullish().describe('Order status'),
      phoneNumbersCount: z.number().describe('Number of phone numbers in the order'),
      createdAt: z.string().nullish().describe('When the order was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });
    if (ctx.input.action === 'create' && !ctx.input.phoneNumbers)
      invalid('Provide phoneNumbers for create.');
    const result =
      ctx.input.action === 'get'
        ? await client.getNumberOrder(required(ctx.input.orderId, 'orderId'))
        : await client.orderPhoneNumbers(ctx.input.phoneNumbers!);

    return {
      output: {
        orderId: result.id,
        status: result.status,
        phoneNumbersCount: result.phone_numbers_count,
        createdAt: result.created_at
      },
      message: `Order **${result.id}** contains ${result.phone_numbers_count} number(s); native status **${result.status}**. Acceptance does not mean provisioning is complete.`
    };
  })
  .build();
