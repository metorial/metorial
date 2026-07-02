import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addSubscriberToForm = SlateTool.create(spec, {
  name: 'Add Subscriber to Form',
  key: 'add_subscriber_to_form',
  description: `Add a subscriber to a specific sign-up form. You can identify the subscriber by their ID or email address. This triggers any automations connected to the form.`
})
  .input(
    z.object({
      formId: z.number().describe('The form ID to add the subscriber to'),
      subscriberId: z
        .number()
        .optional()
        .describe('Subscriber ID (provide either this or emailAddress)'),
      emailAddress: z
        .string()
        .optional()
        .describe('Subscriber email address (provide either this or subscriberId)')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Subscriber ID'),
      emailAddress: z.string().describe('Subscriber email address'),
      state: z.string().describe('Subscriber state')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.subscriberId && !ctx.input.emailAddress) {
      throw new Error('Provide either subscriberId or emailAddress');
    }

    let data: any;
    if (ctx.input.subscriberId) {
      data = await client.addSubscriberToForm(ctx.input.formId, ctx.input.subscriberId);
    } else {
      data = await client.addSubscriberToFormByEmail(
        ctx.input.formId,
        ctx.input.emailAddress!
      );
    }

    let s = data.subscriber;
    return {
      output: {
        subscriberId: s.id,
        emailAddress: s.email_address,
        state: s.state
      },
      message: `Added **${s.email_address}** to form \`${ctx.input.formId}\`.`
    };
  })
  .build();
