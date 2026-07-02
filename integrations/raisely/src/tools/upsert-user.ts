import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let upsertUser = SlateTool.create(spec, {
  name: 'Upsert User',
  key: 'upsert_user',
  description: `Create or update a supporter record by email. If a user with the given email already exists, their record is updated. Otherwise a new user is created. Optionally tag the user and log an interaction in a single call.`,
  instructions: [
    'The email field is used to match existing users for upsert.',
    'Tags and interactions can be added in the same call.',
    'campaignUuid is required to associate the user with a campaign.'
  ]
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign to associate the user with'),
      email: z.string().describe('User email address (used for matching on upsert)'),
      firstName: z.string().optional().describe('User first name'),
      lastName: z.string().optional().describe('User last name'),
      phoneNumber: z.string().optional().describe('User phone number'),
      postcode: z.string().optional().describe('User postcode'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the user'),
      interaction: z
        .object({
          categoryUuid: z.string().optional().describe('Interaction category UUID'),
          detail: z.string().optional().describe('Interaction detail/notes')
        })
        .optional()
        .describe('Log an interaction on the user record'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      user: z.record(z.string(), z.any()).describe('The created or updated user record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      campaignUuid: ctx.input.campaignUuid,
      email: ctx.input.email
    };
    if (ctx.input.firstName) data.firstName = ctx.input.firstName;
    if (ctx.input.lastName) data.lastName = ctx.input.lastName;
    if (ctx.input.phoneNumber) data.phoneNumber = ctx.input.phoneNumber;
    if (ctx.input.postcode) data.postcode = ctx.input.postcode;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.interaction) data.interaction = ctx.input.interaction;
    if (ctx.input.customFields) data.public = ctx.input.customFields;

    let result = await client.upsertUser(data);
    let user = result.data || result;

    return {
      output: { user },
      message: `Upserted user **${ctx.input.email}**.`
    };
  })
  .build();
