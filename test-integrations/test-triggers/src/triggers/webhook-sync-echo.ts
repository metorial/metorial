import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let webhookSyncEcho = SlateTrigger.create(spec, {
  key: 'webhook_sync_echo',
  name: 'Webhook Sync Echo',
  description:
    'Returns an immediate HTTP response while also emitting the received payload as a trigger event.'
})
  .input(
    z.object({
      payload: z.string()
    })
  )
  .output(
    z.object({
      payload: z.string()
    })
  )
  .webhook({
    http: {
      methods: ['POST'],
      sync: {
        mode: 'match',
        match: [
          { hasHeader: 'x-test-sync' },
          { formBodyField: { path: 'mode', equals: 'subscribe' } }
        ],
        timeoutMs: 5_000
      }
    },
    handleRequest: async ctx => {
      let payload = await ctx.request.text();

      return {
        inputs: [{ payload }],
        response: new Response('webhook accepted', {
          status: 201,
          headers: {
            'content-type': 'text/plain',
            'x-test-webhook-response': 'sync-echo'
          }
        })
      };
    },
    handleEvent: async ctx => ({
      type: 'test.webhook.sync_echo',
      id: `webhook-sync-echo-${ctx.input.payload}`,
      output: {
        payload: ctx.input.payload
      }
    })
  })
  .build();
