import { SlateTool } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { spec } from '../spec';

export let getUpdates = SlateTool.create(spec, {
  name: 'Get Updates',
  key: 'get_updates',
  description:
    'Retrieve recently changed Hacker News item IDs and usernames. Use get_item and get_user to retrieve their current data. This feed is a current snapshot, not a complete change history.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      itemIds: z.array(z.number()).describe('Recently changed item IDs'),
      usernames: z.array(z.string()).describe('Recently changed profile usernames')
    })
  )
  .handleInvocation(async () => {
    let updates = await new HNClient().getUpdates();
    return {
      output: { itemIds: updates.items, usernames: updates.profiles },
      message: `Retrieved ${updates.items.length} changed item IDs and ${updates.profiles.length} changed usernames.`
    };
  })
  .build();
