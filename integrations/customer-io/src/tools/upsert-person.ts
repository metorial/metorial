import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrackClient } from '../lib/client';
import { spec } from '../spec';

export let upsertPerson = SlateTool.create(spec, {
  name: 'Create or Update Person',
  key: 'upsert_person',
  description: `Create a new person or update an existing person in your Customer.io workspace. If no person exists with the given identifier, a new person is created. If a person already exists, their attributes are updated.
You can set any custom attributes on the person, including email, name, plan, and any other key-value pairs.`,
  instructions: [
    "The identifier is typically the person's unique ID in your system, or their email address.",
    'Any attributes you pass will be set on the person profile. Existing attributes not included in the request are left unchanged.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      personIdentifier: z
        .string()
        .describe('The unique identifier for the person (user ID or email address)'),
      attributes: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Key-value pairs of attributes to set on the person (e.g. email, name, plan, etc.)'
        )
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

    await trackClient.identifyPerson(ctx.input.personIdentifier, ctx.input.attributes ?? {});

    return {
      output: { success: true },
      message: `Successfully created or updated person **${ctx.input.personIdentifier}**.`
    };
  })
  .build();
