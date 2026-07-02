import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieve a single subscriber's full profile including email, name, status, and all custom field values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subscriberId: z.number().describe('The subscriber ID to look up')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Unique subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      firstName: z.string().nullable().describe('Subscriber first name'),
      state: z.string().describe('Subscriber state'),
      createdAt: z.string().describe('When the subscriber was created'),
      fields: z.record(z.string(), z.string().nullable()).describe('Custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.getSubscriber(ctx.input.subscriberId);
    let s = data.subscriber;

    return {
      output: {
        subscriberId: s.id,
        emailAddress: s.email_address,
        firstName: s.first_name,
        state: s.state,
        createdAt: s.created_at,
        fields: s.fields
      },
      message: `Retrieved subscriber **${s.email_address}** (${s.state}).`
    };
  })
  .build();
