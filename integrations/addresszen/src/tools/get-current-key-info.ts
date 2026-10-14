import { SlateTool } from 'slates';
import { z } from 'zod';
import { AddressZenClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentKeyInfo = SlateTool.create(spec, {
  name: 'Get Current Key Info',
  key: 'get_current_key_info',
  description:
    'Check whether the connected API key can perform lookups and discover its licensed countries. Pass a country ISO alpha-3 code as context when searching addresses.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      available: z
        .boolean()
        .describe('Whether the connected key can currently perform lookups'),
      context: z
        .string()
        .describe('Licensed country closest to the caller, or an empty string'),
      contexts: z
        .array(
          z.object({
            countryIso3: z.string(),
            countryIso2: z.string(),
            name: z.string(),
            emoji: z.string(),
            reverseGeocoding: z.boolean()
          })
        )
        .describe('Countries licensed for this API key'),
      code: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AddressZenClient(ctx.auth).getKeyAvailability(ctx.auth.token);
    let key = result.result;
    return {
      output: {
        available: key.available,
        context: key.context,
        contexts: key.contexts.map(
          (country: {
            iso_3: string;
            iso_2: string;
            description: string;
            emoji: string;
            rgeo: boolean;
          }) => ({
            countryIso3: country.iso_3,
            countryIso2: country.iso_2,
            name: country.description,
            emoji: country.emoji,
            reverseGeocoding: country.rgeo
          })
        ),
        code: result.code
      },
      message: key.available
        ? 'The connected API key is available for lookups.'
        : 'The connected API key is currently unavailable for lookups.'
    };
  })
  .build();
