import { SlateTool } from 'slates';
import { z } from 'zod';
import { TavePublicClient, textField } from '../lib/client';
import { spec } from '../spec';

export let getStudio = SlateTool.create(spec, {
  name: 'Get Studio',
  key: 'get_studio',
  description:
    'Retrieves the studio associated with the API key, including its identity, currency, and default brand. Requires API Key (Public API V2) authentication.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      studioId: z.string().describe('ID of the authenticated studio'),
      name: z.string().describe('Studio name'),
      email: z.string().optional().describe('Studio email address'),
      currencyCode: z.string().optional().describe('Studio currency code'),
      defaultBrandId: z.string().optional().describe('Default brand ID'),
      raw: z.any().describe('Full studio record')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new TavePublicClient(ctx.auth).getStudio();
    return {
      output: {
        studioId: String(result.id ?? ''),
        name: textField(result, 'name') ?? '',
        email: textField(result, 'email'),
        currencyCode: textField(result, 'currencyCode'),
        defaultBrandId: textField(result, 'defaultBrandId'),
        raw: result
      },
      message: `Retrieved studio **${textField(result, 'name') ?? result.id}**.`
    };
  })
  .build();
