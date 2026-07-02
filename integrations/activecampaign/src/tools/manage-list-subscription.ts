import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageListSubscription = SlateTool.create(spec, {
  name: 'Manage List Subscription',
  key: 'manage_list_subscription',
  description: `Subscribes or unsubscribes a contact to/from a mailing list. Status 1 subscribes the contact and status 2 unsubscribes them.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      listId: z.string().describe('ID of the list'),
      status: z
        .enum(['subscribe', 'unsubscribe'])
        .describe('Whether to subscribe or unsubscribe the contact')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      contactListId: z.string().optional().describe('ID of the contact-list association')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let statusCode = ctx.input.status === 'subscribe' ? 1 : 2;
    let result = await client.updateContactListStatus(
      ctx.input.contactId,
      ctx.input.listId,
      statusCode
    );

    let action = ctx.input.status === 'subscribe' ? 'subscribed to' : 'unsubscribed from';

    return {
      output: {
        success: true,
        contactListId: result.contactList?.id || result.contacts?.[0]?.id
      },
      message: `Contact (ID: ${ctx.input.contactId}) ${action} list (ID: ${ctx.input.listId}).`
    };
  })
  .build();
