import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GistClient } from '../lib/client';
import { requiredId, responseList } from '../lib/response';
import { spec } from '../spec';

export let manageSubscriptionType = SlateTool.create(spec, {
  name: 'Manage Subscription Type',
  key: 'manage_subscription_type',
  description: `List subscription types, or attach/detach a contact to control which communication categories they receive.`
})
  .input(
    z.object({
      action: z.enum(['list', 'attach', 'detach']).describe('Action to perform'),
      subscriptionTypeId: z
        .string()
        .optional()
        .describe('Subscription type ID (for attach/detach)'),
      contactId: z.string().optional().describe('Contact ID'),
      email: z.string().optional().describe('Contact email')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().optional().describe('Complete provider response data'),
      subscriptionTypes: z
        .array(
          z.object({
            subscriptionTypeId: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      success: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GistClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'list': {
        let data = await client.listSubscriptionTypes();
        let types = responseList(data.subscription_types).map((t: any) => ({
          subscriptionTypeId: requiredId(t.id),
          name: t.name
        }));
        return {
          output: { rawResponse: client.responses, subscriptionTypes: types },
          message: `Found **${types.length}** subscription types.`
        };
      }

      case 'attach': {
        if (!ctx.input.subscriptionTypeId)
          throw createApiServiceError('subscriptionTypeId is required');
        if (!ctx.input.contactId && !ctx.input.email)
          throw createApiServiceError('Provide contactId or email.');
        let body: Record<string, any> = {};
        if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
        if (ctx.input.email) body.email = ctx.input.email;
        await client.attachSubscriptionType(ctx.input.subscriptionTypeId, body);
        return {
          output: { rawResponse: client.responses, success: true },
          message: `Contact attached to subscription type **${ctx.input.subscriptionTypeId}**.`
        };
      }

      case 'detach': {
        if (!ctx.input.subscriptionTypeId)
          throw createApiServiceError('subscriptionTypeId is required');
        if (!ctx.input.contactId && !ctx.input.email)
          throw createApiServiceError('Provide contactId or email.');
        let body: Record<string, any> = {};
        if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
        if (ctx.input.email) body.email = ctx.input.email;
        await client.detachSubscriptionType(ctx.input.subscriptionTypeId, body);
        return {
          output: { rawResponse: client.responses, success: true },
          message: `Contact detached from subscription type **${ctx.input.subscriptionTypeId}**.`
        };
      }
    }
  })
  .build();
