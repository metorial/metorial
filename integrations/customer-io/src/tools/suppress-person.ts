import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackClient } from '../lib/client';
import { spec } from '../spec';

export let suppressPerson = SlateTool.create(spec, {
  name: 'Suppress or Unsuppress Person',
  key: 'suppress_person',
  description: `Suppress or unsuppress a person in your Customer.io workspace. Suppressing a person removes them and prevents them from being re-added. Unsuppressing allows a previously suppressed person to be added back.`,
  instructions: [
    'Use suppress to block all messaging and prevent re-addition.',
    'Use unsuppress to re-enable a previously suppressed person.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personIdentifier: z
        .string()
        .describe('The unique identifier for the person (user ID or email)'),
      action: z
        .enum(['suppress', 'unsuppress'])
        .describe('Whether to suppress or unsuppress the person')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let trackClient = new TrackClient({
      siteId: ctx.auth.siteId,
      trackApiKey: ctx.auth.trackApiKey,
      region: ctx.config.region
    });

    if (ctx.input.action === 'suppress') {
      await trackClient.suppressPerson(ctx.input.personIdentifier);
    } else {
      await trackClient.unsuppressPerson(ctx.input.personIdentifier);
    }

    return {
      output: { success: true },
      message: `Successfully ${ctx.input.action === 'suppress' ? 'suppressed' : 'unsuppressed'} person **${ctx.input.personIdentifier}**.`
    };
  })
  .build();
