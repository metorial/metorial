import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDeletedProperties = SlateTool.create(spec, {
  name: 'List Deleted Properties',
  key: 'list_deleted_properties',
  description: `List the IDs of properties that have been deleted, optionally only those deleted after a given date. Use this to reconcile a local copy of the property list by removing properties that no longer exist.`,
  instructions: [
    'This returns identifiers only, not property records. Details for these properties cannot be fetched, because the properties themselves are gone, so do not follow up with a get-property call for them.',
    'Pass a date to keep a synced copy up to date incrementally, using the timestamp of the previous run.',
    'Every deleted property is returned in a single response; there are no pages to request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      deletedSince: z
        .string()
        .optional()
        .describe(
          'Only return properties deleted after this date and time (ISO datetime). Omit to return every deleted property'
        )
    })
  )
  .output(
    z.object({
      propertyIds: z
        .array(z.number())
        .describe(
          'IDs of the deleted properties. These are identifiers only, not property records, and no further details can be retrieved for them'
        ),
      count: z.number().describe('Number of deleted property IDs returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDeletedProperties({
      deletedSince: ctx.input.deletedSince
    });

    let propertyIds = Array.isArray(result) ? result : [];
    let sinceText = ctx.input.deletedSince ? ` deleted since ${ctx.input.deletedSince}` : '';

    return {
      output: { propertyIds, count: propertyIds.length },
      message: `Found **${propertyIds.length}** deleted property IDs${sinceText}.`
    };
  })
  .build();
