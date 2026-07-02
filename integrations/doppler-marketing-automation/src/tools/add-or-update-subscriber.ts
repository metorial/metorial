import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addOrUpdateSubscriber = SlateTool.create(spec, {
  name: 'Add or Update Subscriber',
  key: 'add_or_update_subscriber',
  description: `Add a new subscriber to a list or update an existing subscriber's data. If the subscriber already exists, their fields will be updated with the provided values.
Fields not included in the request retain their previous values.`,
  instructions: [
    'Common field names include: FIRSTNAME, LASTNAME, BIRTHDAY (yyyy-MM-dd format), GENDER (M or F), COUNTRY (ISO 3166-1 alpha-2 code).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.number().describe('ID of the list to add the subscriber to'),
      email: z.string().describe('Email address of the subscriber'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name (e.g. FIRSTNAME, LASTNAME, BIRTHDAY)'),
            value: z.string().describe('Field value')
          })
        )
        .optional()
        .describe('Custom field values to set on the subscriber')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the subscriber'),
      listId: z.number().describe('ID of the list the subscriber was added to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.config.accountEmail
    });

    await client.addOrUpdateSubscriber(ctx.input.listId, {
      email: ctx.input.email,
      fields: ctx.input.fields
    });

    return {
      output: {
        email: ctx.input.email,
        listId: ctx.input.listId
      },
      message: `Subscriber **${ctx.input.email}** added/updated in list \`${ctx.input.listId}\`.`
    };
  })
  .build();
