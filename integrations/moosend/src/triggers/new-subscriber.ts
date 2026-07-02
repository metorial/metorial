import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import { spec } from '../spec';

export let newSubscriber = SlateTrigger.create(spec, {
  name: 'New Subscriber',
  key: 'new_subscriber',
  description:
    'Triggers when a new subscriber is added to a mailing list or when an existing subscriber is updated.'
})
  .input(
    z.object({
      subscriberId: z.string().describe('Subscriber ID'),
      email: z.string().describe('Subscriber email address'),
      name: z.string().optional().describe('Subscriber name'),
      mailingListId: z.string().describe('ID of the mailing list'),
      createdOn: z.string().optional().describe('Subscription timestamp'),
      updatedOn: z.string().optional().describe('Last update timestamp'),
      customFields: z
        .array(
          z.object({
            fieldName: z.string().optional().describe('Custom field name'),
            fieldValue: z.string().optional().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .output(
    z.object({
      subscriberId: z.string().describe('Subscriber ID'),
      email: z.string().describe('Subscriber email address'),
      name: z.string().optional().describe('Subscriber name'),
      mailingListId: z.string().describe('ID of the mailing list'),
      createdOn: z.string().optional().describe('Subscription timestamp'),
      updatedOn: z.string().optional().describe('Last update timestamp'),
      customFields: z
        .array(
          z.object({
            fieldName: z.string().optional().describe('Custom field name'),
            fieldValue: z.string().optional().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field values')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MoosendClient({ token: ctx.auth.token });
      let state = ctx.state ?? {};
      let lastPollTime = state.lastPollTime as string | undefined;

      // Fetch all mailing lists
      let listsResult = await client.getMailingLists(1, 100);
      let lists = (listsResult?.MailingLists as Record<string, unknown>[]) ?? [];

      let inputs: Array<{
        subscriberId: string;
        email: string;
        name?: string;
        mailingListId: string;
        createdOn?: string;
        updatedOn?: string;
        customFields?: Array<{ fieldName?: string; fieldValue?: string }>;
      }> = [];

      for (let list of lists) {
        let listId = String(list?.ID ?? '');
        if (!listId) continue;

        try {
          let result = await client.getSubscribersByStatus(
            listId,
            'Subscribed',
            1,
            100,
            lastPollTime
          );
          let subscribers = (result?.Subscribers as Record<string, unknown>[]) ?? [];

          for (let sub of subscribers) {
            let customFields = Array.isArray(sub?.CustomFields)
              ? (sub.CustomFields as Record<string, unknown>[]).map(cf => ({
                  fieldName: cf?.Name ? String(cf.Name) : undefined,
                  fieldValue: cf?.Value ? String(cf.Value) : undefined
                }))
              : undefined;

            inputs.push({
              subscriberId: String(sub?.ID ?? ''),
              email: String(sub?.Email ?? ''),
              name: sub?.Name ? String(sub.Name) : undefined,
              mailingListId: listId,
              createdOn: sub?.CreatedOn ? String(sub.CreatedOn) : undefined,
              updatedOn: sub?.UpdatedOn ? String(sub.UpdatedOn) : undefined,
              customFields
            });
          }
        } catch (e) {
          ctx.warn({ message: `Failed to fetch subscribers for list ${listId}`, error: e });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPollTime: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'subscriber.added',
        id: `${ctx.input.mailingListId}-${ctx.input.subscriberId}`,
        output: {
          subscriberId: ctx.input.subscriberId,
          email: ctx.input.email,
          name: ctx.input.name,
          mailingListId: ctx.input.mailingListId,
          createdOn: ctx.input.createdOn,
          updatedOn: ctx.input.updatedOn,
          customFields: ctx.input.customFields
        }
      };
    }
  })
  .build();
