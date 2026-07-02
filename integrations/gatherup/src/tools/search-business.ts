import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchBusiness = SlateTool.create(spec, {
  name: 'Search Business',
  key: 'search_business',
  description: `Search for a business location by its custom field or extra field value. Returns the matching business ID. Useful when you have a custom identifier from an external system and need to find the corresponding GatherUp business.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchBy: z.enum(['customField', 'extraField']).describe('Field to search by'),
      searchValue: z.string().describe('Value to search for')
    })
  )
  .output(
    z.object({
      businessId: z.number().describe('The matching business ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.searchBusiness({
      by: ctx.input.searchBy,
      search: ctx.input.searchValue
    });

    if (data.errorCode !== 0) {
      throw new Error(
        `Business search failed: ${data.errorMessage} (code: ${data.errorCode})`
      );
    }

    return {
      output: {
        businessId: data.businessId
      },
      message: `Found business with ID **${data.businessId}** matching ${ctx.input.searchBy}="${ctx.input.searchValue}".`
    };
  })
  .build();
