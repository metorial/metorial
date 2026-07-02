import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addSubscriber = SlateTool.create(spec, {
  name: 'Add Subscriber',
  key: 'add_subscriber',
  description: `Add a new subscriber to the newsletter. Requires an email address, with optional first and last name. The subscriber will be added as active and will begin receiving future newsletter emails.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber'),
      firstName: z.string().optional().describe('First name of the subscriber'),
      lastName: z.string().optional().describe('Last name of the subscriber')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the created subscriber'),
      firstName: z.string().describe('First name of the subscriber'),
      lastName: z.string().describe('Last name of the subscriber'),
      name: z.string().describe('Full name of the subscriber')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let subscriber = await client.createSubscriber({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName
    });

    return {
      output: subscriber,
      message: `Added subscriber **${subscriber.email}**${subscriber.name ? ` (${subscriber.name})` : ''}.`
    };
  })
  .build();
