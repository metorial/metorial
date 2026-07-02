import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let mailingListAddressesValidated = SlateTrigger.create(spec, {
  name: 'Mailing List Addresses Validated',
  key: 'mailing_list_addresses_validated',
  description:
    'Triggered when addresses in a mailing list have been validated. Address validation is a paid add-on service.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of event'),
      mailingListId: z.string().describe('The mailing list ID'),
      payload: z.record(z.string(), z.any()).optional().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      mailingListId: z.string().describe('The mailing list ID whose addresses were validated')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.type ?? 'mailing_list.addresses_validated',
            mailingListId: data.mailing_list ?? data.id,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'mailing_list.addresses_validated',
        id: `${ctx.input.mailingListId}_validated_${Date.now()}`,
        output: {
          mailingListId: ctx.input.mailingListId
        }
      };
    }
  })
  .build();
