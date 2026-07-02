import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description: `Retrieve a subscriber's profile by email address. Returns their custom field values, status, score, and unsubscription details if applicable.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber to look up')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Subscriber email address'),
      status: z.string().describe('Subscriber status (active, pending, or unsubscribed)'),
      score: z.number().describe('Subscriber engagement score'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            value: z.string().describe('Field value')
          })
        )
        .describe('Custom field values for the subscriber'),
      unsubscriptionDate: z
        .string()
        .optional()
        .describe('Date the subscriber unsubscribed, if applicable'),
      unsubscriptionType: z
        .string()
        .optional()
        .describe('Reason for unsubscription, if applicable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    let subscriber = await client.getSubscriber(ctx.input.email);

    return {
      output: {
        email: subscriber.email,
        status: subscriber.status,
        score: subscriber.score,
        fields: subscriber.fields ?? [],
        unsubscriptionDate: subscriber.unsubscriptionDate,
        unsubscriptionType: subscriber.unsubscriptionType
      },
      message: `Subscriber **${subscriber.email}** is **${subscriber.status}** with a score of ${subscriber.score}.`
    };
  })
  .build();
