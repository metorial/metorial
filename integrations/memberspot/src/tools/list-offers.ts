import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getMemberspotList } from '../lib/responses';
import { spec } from '../spec';

export let listOffersTool = SlateTool.create(spec, {
  name: 'List Offers',
  key: 'list_offers',
  description: `Retrieve all available offers (courses/products) configured in your Memberspot account. Useful for dynamically populating course selections in automations or looking up offer IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      offers: z.array(z.record(z.string(), z.any())).describe('List of offer objects'),
      raw: z.any().optional().describe('Unmodified provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOffers();
    let offers = getMemberspotList(result, ['offers', 'data']);

    return {
      output: { offers, raw: result },
      message: `Retrieved **${offers.length}** offer(s) from Memberspot.`
    };
  })
  .build();
