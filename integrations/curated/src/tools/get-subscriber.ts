import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { publicationIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getSubscriber = SlateTool.create(spec, {
  name: 'Get Subscriber',
  key: 'get_subscriber',
  description:
    'Retrieve an email subscriber by ID. Call list_publications for a publication ID and list_subscribers for subscriber IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      publicationId: publicationIdSchema,
      subscriberId: z
        .string()
        .describe('Subscriber ID. Call list_subscribers to discover subscriber IDs.')
    })
  )
  .output(
    z.object({
      subscriberId: z.number().describe('Unique identifier of the subscriber'),
      email: z.string().describe('Email address of the subscriber'),
      createdAt: z.string().optional().describe('Date the subscriber was added'),
      raw: z
        .unknown()
        .optional()
        .describe('Complete provider response, including additional metadata')
    })
  )
  .handleInvocation(async ctx => {
    let subscriber = await new Client({ token: ctx.auth.token }).getSubscriber(
      ctx.input.publicationId,
      ctx.input.subscriberId
    );
    return {
      output: {
        subscriberId: subscriber.id,
        email: subscriber.email,
        createdAt: subscriber.created_at ?? undefined,
        raw: subscriber
      },
      message: `Retrieved subscriber **${subscriber.id}**.`
    };
  })
  .build();
