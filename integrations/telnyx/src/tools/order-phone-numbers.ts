import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
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
      phoneNumbers: z
        .array(z.string())
        .min(1)
        .describe('Array of phone numbers to order in E.164 format')
    })
  )
  .output(
    z.object({
      orderId: z.string().describe('Unique ID of the number order'),
      status: z.string().optional().describe('Order status'),
      phoneNumbersCount: z.number().describe('Number of phone numbers in the order'),
      createdAt: z.string().optional().describe('When the order was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });
    let result = await client.orderPhoneNumbers(ctx.input.phoneNumbers);

    return {
      output: {
        orderId: result.id,
        status: result.status,
        phoneNumbersCount: ctx.input.phoneNumbers.length,
        createdAt: result.created_at
      },
      message: `Ordered **${ctx.input.phoneNumbers.length}** phone number(s). Order ID: **${result.id}**, Status: ${result.status ?? 'pending'}.`
    };
  })
  .build();
