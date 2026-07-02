import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person's profile fields. Accepts a map of profile field IDs to new values. Use **List Profile Fields** to discover available field IDs and types.`,
  instructions: [
    'Use the List Profile Fields tool to discover available field IDs before updating.',
    'Only fields included in the update will be changed; other fields remain untouched.'
  ]
})
  .input(
    z.object({
      personId: z.string().describe('ID of the person to update'),
      fields: z
        .record(z.string(), z.any())
        .describe('Profile field values to update, as a map of field ID to new value')
    })
  )
  .output(
    z.object({
      person: z.any().describe('The updated person record')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let person = await client.updatePerson(
      ctx.input.personId,
      JSON.stringify(ctx.input.fields)
    );

    return {
      output: { person },
      message: `Updated person (ID: ${ctx.input.personId}).`
    };
  })
  .build();
