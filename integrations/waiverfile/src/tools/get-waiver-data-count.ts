import { SlateTool } from 'slates';
import { z } from 'zod';
import { WaiverFileClient } from '../lib/client';
import { spec } from '../spec';

export let getWaiverDataCount = SlateTool.create(spec, {
  name: 'Get Waiver Data Count',
  key: 'get_waiver_data_count',
  description:
    'Retrieve the provider count response for waiver data in a signing date range before paging through list_waivers_by_date. Returns the complete count data supplied by WaiverFile.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      startDate: z.string().describe('Start of the signing date range in UTC, ISO 8601'),
      endDate: z.string().describe('End of the signing date range in UTC, ISO 8601')
    })
  )
  .output(z.object({ countData: z.any().describe('Complete provider count response') }))
  .handleInvocation(async ctx => {
    let client = new WaiverFileClient(ctx.auth);
    let countData = await client.getWaiverDataCount(ctx.input);
    return { output: { countData }, message: 'Retrieved the waiver data count response.' };
  })
  .build();
