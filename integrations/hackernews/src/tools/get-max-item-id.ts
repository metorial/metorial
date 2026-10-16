import { SlateTool } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { spec } from '../spec';

export let getMaxItemId = SlateTool.create(spec, {
  name: 'Get Maximum Item ID',
  key: 'get_max_item_id',
  description:
    'Retrieve the current largest Hacker News item ID. Walk backward through IDs with get_item to discover items; individual IDs may be unavailable.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ itemId: z.number().describe('Current largest item ID') }))
  .handleInvocation(async () => {
    let itemId = await new HNClient().getMaxItemId();
    return { output: { itemId }, message: `The current largest item ID is ${itemId}.` };
  })
  .build();
