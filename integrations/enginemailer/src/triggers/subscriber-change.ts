import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let subscriberChange = SlateTrigger.create(spec, {
  name: 'Subscriber Change',
  key: 'subscriber_change',
  description:
    '[Polling fallback] Polls for subscriber changes including new subscribers, modifications, deletions, unsubscribes, tagging, and untagging events.'
})
  .input(
    z.object({
      changeType: z.string().describe('Type of subscriber change'),
      email: z.string().describe('Email address of the subscriber'),
      subscriberData: z.any().optional().describe('Subscriber data from the event')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the subscriber'),
      subscriberData: z.any().optional().describe('Full subscriber data if available')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let lastPollingDate = (ctx.state as any)?.lastPollingDate as string | undefined;
      let inputs: Array<{ changeType: string; email: string; subscriberData: any }> = [];

      let pollParams = {
        lastPollingDate,
        limit: 100
      };

      // Poll all subscriber change endpoints
      let [newSubs, modifiedSubs, deletedSubs, unsubscribes, tagged, untagged] =
        await Promise.allSettled([
          client.getNewSubscribers(pollParams),
          client.getModifiedSubscribers(pollParams),
          client.getDeletedSubscribers(pollParams),
          client.getUnsubscribes(pollParams),
          client.getTaggedSubscribers(pollParams),
          client.getUntaggedSubscribers(pollParams)
        ]);

      let extractItems = (result: PromiseSettledResult<any>, changeType: string) => {
        if (result.status === 'fulfilled' && result.value) {
          let data = result.value;
          let items = Array.isArray(data) ? data : (data?.Result?.Data ?? data?.data ?? []);
          if (Array.isArray(items)) {
            for (let item of items) {
              let email =
                item.email ?? item.Email ?? item.emailaddress ?? item.EmailAddress ?? '';
              if (email) {
                inputs.push({
                  changeType,
                  email: email.toString(),
                  subscriberData: item
                });
              }
            }
          }
        }
      };

      extractItems(newSubs, 'created');
      extractItems(modifiedSubs, 'modified');
      extractItems(deletedSubs, 'deleted');
      extractItems(unsubscribes, 'unsubscribed');
      extractItems(tagged, 'tagged');
      extractItems(untagged, 'untagged');

      return {
        inputs,
        updatedState: {
          lastPollingDate: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let type = `subscriber.${ctx.input.changeType}`;
      let id = `${type}-${ctx.input.email}-${Date.now()}`;

      return {
        type,
        id,
        output: {
          email: ctx.input.email,
          subscriberData: ctx.input.subscriberData
        }
      };
    }
  })
  .build();
