import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let unsubscribeMember = SlateTool.create(spec, {
  name: 'Unsubscribe From Emails',
  key: 'unsubscribe_from_emails',
  description: `Unsubscribe a member from receiving email campaigns. Only one member can be unsubscribed at a time.
Can also retrieve or manage unsubscribe records.`,
  constraints: ['Only one member can be unsubscribed at a time.']
})
  .input(
    z.object({
      action: z
        .enum(['get', 'create', 'update', 'delete'])
        .describe('The action to perform on the unsubscribe record.'),
      unsubscribeId: z
        .string()
        .optional()
        .describe('The unsubscribe record ID. Required for get, update, and delete actions.'),
      email: z
        .string()
        .optional()
        .describe('The email address to unsubscribe. Used for create action.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      unsubscribeRecord: z.any().describe('The unsubscribe record or confirmation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    switch (ctx.input.action) {
      case 'get':
        if (!ctx.input.unsubscribeId)
          throw new Error('unsubscribeId is required for get action.');
        result = await client.getUnsubscribe(ctx.input.unsubscribeId);
        break;
      case 'create': {
        let data: Record<string, any> = {};
        if (ctx.input.email) data.email = ctx.input.email;
        if (ctx.input.additionalFields) {
          for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
            data[key] = value;
          }
        }
        result = await client.createUnsubscribe(data);
        break;
      }
      case 'update': {
        if (!ctx.input.unsubscribeId)
          throw new Error('unsubscribeId is required for update action.');
        let data: Record<string, any> = { unsub_id: ctx.input.unsubscribeId };
        if (ctx.input.email) data.email = ctx.input.email;
        if (ctx.input.additionalFields) {
          for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
            data[key] = value;
          }
        }
        result = await client.updateUnsubscribe(data);
        break;
      }
      case 'delete':
        if (!ctx.input.unsubscribeId)
          throw new Error('unsubscribeId is required for delete action.');
        result = await client.deleteUnsubscribe(ctx.input.unsubscribeId);
        break;
    }

    return {
      output: {
        status: result.status,
        unsubscribeRecord: result.message
      },
      message: `Completed unsubscribe ${ctx.input.action} action.`
    };
  })
  .build();
