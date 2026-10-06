import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import {
  accountInput,
  id,
  optionalText,
  pagingInput,
  pagingOutput,
  unexpected
} from '../lib/contracts';
import { spec } from '../spec';
export const listPixels = SlateTool.create(spec, {
  key: 'list_pixels',
  name: 'List Pixels',
  description:
    'Discover one page of Pixels available to a selected advertising account for campaign measurement and conversion-event targeting.',
  tags: { readOnly: true }
})
  .input(z.object({ accountId: accountInput, ...pagingInput }))
  .output(
    z.object({
      pixels: z.array(
        z.object({
          pixelId: z.string(),
          name: z.string().optional(),
          businessId: z.string().optional(),
          raw: z.unknown()
        })
      ),
      ...pagingOutput
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const account = await client.getAccount();
    const page = await client.pixels(ctx.input);
    return {
      output: {
        pixels: page.items.map(pixel => {
          if (account.business_id !== undefined && pixel.business_id !== account.business_id)
            unexpected();
          return {
            pixelId: id(pixel.id),
            name: optionalText(pixel.name),
            businessId: optionalText(pixel.business_id),
            raw: pixel
          };
        }),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message: 'Retrieved one page of Pixels scoped to the exact account.'
    };
  })
  .build();
