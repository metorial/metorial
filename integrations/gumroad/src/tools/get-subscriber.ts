import { SlateTool } from 'slates';
import { z } from 'zod';
import { GumroadClient } from '../lib/client';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieve detailed information about a specific Gumroad subscriber by their subscriber ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriberId: z.string().describe('The subscriber ID to retrieve')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Unique subscriber ID'),
      productId: z.string().optional().describe('Product ID'),
      productName: z.string().optional().describe('Product name'),
      userId: z.string().optional().describe('Gumroad user ID'),
      email: z.string().optional().describe('Subscriber email address'),
      status: z.string().optional().describe('Subscription status'),
      createdAt: z.string().optional().describe('Subscription creation timestamp'),
      endedAt: z.string().optional().describe('Subscription end timestamp'),
      licenseKey: z.string().optional().describe('License key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GumroadClient({ token: ctx.auth.token });
    let s = await client.getSubscriber(ctx.input.subscriberId);

    return {
      output: {
        subscriberId: s.id,
        productId: s.product_id || undefined,
        productName: s.product_name || undefined,
        userId: s.user_id || undefined,
        email: s.email || undefined,
        status: s.status || undefined,
        createdAt: s.created_at || undefined,
        endedAt: s.ended_at || undefined,
        licenseKey: s.license_key || undefined
      },
      message: `Retrieved subscriber **${s.id}** (${s.email || 'no email'}).`
    };
  })
  .build();
