import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let getPerson = SlateTool.create(spec, {
  name: 'Get Person',
  key: 'get_person',
  description: `Look up a person in your Customer.io workspace and retrieve their attributes, segments, and recent activity. You can look up a person by their ID, email, or cio_id.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      personIdentifier: z
        .string()
        .describe('The person identifier — an ID, email address, or cio_id'),
      identifierType: z
        .enum(['id', 'email', 'cio_id'])
        .default('id')
        .describe('The type of identifier provided')
    })
  )
  .output(
    z.object({
      customer: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('The person object with all attributes')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let customer: Record<string, unknown> | undefined;

    if (ctx.input.identifierType === 'email') {
      let result = await appClient.getCustomerByEmail(ctx.input.personIdentifier);
      customer = result?.results?.[0] ?? result?.customer ?? result;
    } else {
      let result = await appClient.getCustomerAttributes(
        ctx.input.personIdentifier,
        ctx.input.identifierType
      );
      customer = result?.customer ?? result;
    }

    return {
      output: { customer },
      message: customer
        ? `Found person **${ctx.input.personIdentifier}**.`
        : `No person found for **${ctx.input.personIdentifier}**.`
    };
  })
  .build();
