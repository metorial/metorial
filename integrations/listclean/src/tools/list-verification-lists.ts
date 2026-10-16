import { SlateTool } from 'slates';
import { z } from 'zod';
import { ListcleanClient } from '../lib/client';
import { verificationListSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listVerificationLists = SlateTool.create(spec, {
  name: 'List Verification Lists',
  key: 'list_verification_lists',
  description:
    'Retrieve verification lists with their provider list IDs, source filenames, and processing states. Use the list_id from a result with get_verification_list or download_list_results.',
  constraints: [
    'The API returns total and cursor metadata but documents no request parameter for fetching another page.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      lists: z.array(verificationListSchema),
      total: z.number().optional().describe('Provider-reported total list count'),
      cursor: z.number().optional().describe('Provider-reported cursor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ListcleanClient({ token: ctx.auth.token });
    let result = await client.listVerificationLists();
    return {
      output: result,
      message: `Retrieved **${result.lists.length}** verification list(s).`
    };
  })
  .build();
