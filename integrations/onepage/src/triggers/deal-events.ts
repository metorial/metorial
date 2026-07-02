import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { dealSchema } from '../lib/schemas';
import { spec } from '../spec';

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description:
    'Triggered when a deal is created, updated, deleted, or changes status (pending/won/lost) in OnePageCRM. Configure the webhook URL in OnePageCRM Apps settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of deal event'),
      dealId: z.string().describe('ID of the affected deal'),
      timestamp: z.string().describe('Timestamp of the event'),
      rawData: z.any().describe('Raw deal data from the webhook payload')
    })
  )
  .output(dealSchema)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      if (body.type !== 'deal') {
        return { inputs: [] };
      }

      let dealData = body.data ?? {};

      return {
        inputs: [
          {
            eventType: body.reason ?? 'unknown',
            dealId: dealData.id ?? '',
            timestamp: body.timestamp ?? new Date().toISOString(),
            rawData: dealData
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let d = ctx.input.rawData;

      let output = {
        dealId: d.id ?? ctx.input.dealId,
        contactId: d.contact_id,
        companyId: d.company_id,
        ownerId: d.owner_id,
        name: d.name ?? '',
        amount: d.amount,
        months: d.months,
        status: d.status,
        stage: d.stage,
        expectedCloseDate: d.expected_close_date,
        closeDate: d.close_date,
        text: d.text,
        customFields: d.custom_fields?.map((cf: any) => ({
          customFieldId: cf.custom_field?.id ?? cf.id,
          value: cf.custom_field?.value ?? cf.value
        })),
        createdAt: d.created_at,
        modifiedAt: d.modified_at
      };

      return {
        type: `deal.${ctx.input.eventType}`,
        id: `deal-${ctx.input.dealId}-${ctx.input.eventType}-${ctx.input.timestamp}`,
        output
      };
    }
  })
  .build();
