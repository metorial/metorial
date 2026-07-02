import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackClient } from '../lib/client';
import { spec } from '../spec';

export let deletePerson = SlateTool.create(spec, {
  name: 'Delete Person',
  key: 'delete_person',
  description: `Delete a person from your Customer.io workspace. This removes the person and their data, but does not suppress them — they can be re-added later. Use the suppress action if you want to prevent the person from being re-added.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      personIdentifier: z
        .string()
        .describe('The unique identifier for the person to delete (user ID or email)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let trackClient = new TrackClient({
      siteId: ctx.auth.siteId,
      trackApiKey: ctx.auth.trackApiKey,
      region: ctx.config.region
    });

    await trackClient.deletePerson(ctx.input.personIdentifier);

    return {
      output: { success: true },
      message: `Successfully deleted person **${ctx.input.personIdentifier}**.`
    };
  })
  .build();
