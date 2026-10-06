import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, pagingInput, pagingOutput, resourceOutput } from '../lib/contracts';
import { spec } from '../spec';

export let listCustomAudiences = SlateTool.create(spec, {
  name: 'List Custom Audiences',
  key: 'list_custom_audiences',
  description:
    'Retrieve one page of audiences for a selected ad account. Returns current provider state, size ranges and relationships. Follow nextUrl with the same account to continue.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      ...pagingInput
    })
  )
  .output(
    z.object({
      ...pagingOutput,
      audiences: z.array(
        z.object({
          audienceId: z.string().optional(),
          name: z.string().optional(),
          audienceType: z.string().optional(),
          approximateSize: z.number().optional(),
          sizeRangeLower: z.number().optional(),
          sizeRangeUpper: z.number().optional(),
          status: z.string().optional(),
          raw: z.any().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const page = await createClient(ctx).list('audience', ctx.input);
    return {
      output: {
        audiences: page.items.map(value => resourceOutput('audience', value)),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message: `Retrieved ${page.items.length} audiences in this page${page.hasMore ? '; more pages are available' : ''}.`
    };
  })
  .build();
