import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReferenceData = SlateTool.create(spec, {
  name: 'List Reference Data',
  key: 'list_reference_data',
  description: `Retrieve available languages and countries that can be used to configure app jobs for localized processing. Returns both language and country lists in a single call.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      languages: z
        .array(
          z.object({
            languageCode: z.string().describe('Language code'),
            languageName: z.string().describe('Human-readable language name')
          })
        )
        .describe('Available languages for job configuration'),
      countries: z
        .array(
          z.object({
            countryCode: z.string().describe('Country code'),
            countryName: z.string().describe('Human-readable country name')
          })
        )
        .describe('Available countries for job configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let [languages, countries] = await Promise.all([
      client.listLanguages(),
      client.listCountries()
    ]);

    return {
      output: { languages, countries },
      message: `Found **${languages.length}** language(s) and **${countries.length}** country/countries.`
    };
  })
  .build();
