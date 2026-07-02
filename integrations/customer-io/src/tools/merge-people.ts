import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackClient } from '../lib/client';
import { spec } from '../spec';

export let mergePeople = SlateTool.create(spec, {
  name: 'Merge People',
  key: 'merge_people',
  description: `Merge two person profiles into one. The secondary person's data is consolidated into the primary person's profile, and the secondary profile is removed. Use this to consolidate duplicate profiles.`,
  instructions: [
    'The primary person is the profile that will remain after the merge.',
    'The secondary person will be merged into the primary and then removed.',
    'Identifier types can be "id", "email", or "cio_id".'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      primaryIdentifier: z
        .string()
        .describe('The identifier of the primary (surviving) person profile'),
      primaryIdentifierType: z
        .enum(['id', 'email', 'cio_id'])
        .default('id')
        .describe('The type of the primary identifier'),
      secondaryIdentifier: z
        .string()
        .describe('The identifier of the secondary (merged-in) person profile'),
      secondaryIdentifierType: z
        .enum(['id', 'email', 'cio_id'])
        .default('id')
        .describe('The type of the secondary identifier')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the merge succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let trackClient = new TrackClient({
      siteId: ctx.auth.siteId,
      trackApiKey: ctx.auth.trackApiKey,
      region: ctx.config.region
    });

    await trackClient.mergeCustomers(
      { idType: ctx.input.primaryIdentifierType, id: ctx.input.primaryIdentifier },
      { idType: ctx.input.secondaryIdentifierType, id: ctx.input.secondaryIdentifier }
    );

    return {
      output: { success: true },
      message: `Merged person **${ctx.input.secondaryIdentifier}** into **${ctx.input.primaryIdentifier}**.`
    };
  })
  .build();
