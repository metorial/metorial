import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let getLocales = SlateTool.create(spec, {
  name: 'Get Locales',
  key: 'get_locales',
  description: `Retrieves all available locales configured for the Agility CMS instance. Useful for understanding which languages are supported before fetching content. Requires OAuth authentication.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      locales: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of locale definitions with language codes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.config.locale,
      region: ctx.auth.region
    });

    let result = await client.getLocales();
    let locales = Array.isArray(result) ? result : [];

    return {
      output: { locales },
      message: `Instance has **${locales.length}** locale(s) configured`
    };
  })
  .build();
