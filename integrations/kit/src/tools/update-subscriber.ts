import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateSubscriber = SlateTool.create(spec, {
  name: 'Update Subscriber',
  key: 'update_subscriber',
  description: `Update an existing subscriber's email address, first name, or custom field values.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subscriberId: z.number().describe('The subscriber ID to update'),
      emailAddress: z.string().optional().describe('New email address'),
      firstName: z.string().optional().describe('New first name'),
      fields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values to update as key-value pairs')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Unique subscriber ID'),
      emailAddress: z.string().describe('Updated email address'),
      firstName: z.string().nullable().describe('Updated first name'),
      state: z.string().describe('Subscriber state'),
      fields: z.record(z.string(), z.string().nullable()).describe('All custom field values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.updateSubscriber(ctx.input.subscriberId, {
      emailAddress: ctx.input.emailAddress,
      firstName: ctx.input.firstName,
      fields: ctx.input.fields
    });
    let s = data.subscriber;

    return {
      output: {
        subscriberId: s.id,
        emailAddress: s.email_address,
        firstName: s.first_name,
        state: s.state,
        fields: s.fields
      },
      message: `Updated subscriber **${s.email_address}**.`
    };
  })
  .build();
