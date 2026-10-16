import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReferenceData = SlateTool.create(spec, {
  name: 'List Reference Data',
  key: 'list_reference_data',
  description:
    'DEPRECATED — use `list_languages` instead. Retrieve languages and countries using the legacy code/name object format.',
  instructions: [
    'Use list_languages for the documented language strings; it replaces only the language portion of this tool.',
    'Country discovery is available only through this legacy combined call. It has not been revalidated and may fail when language results use the current string format.'
  ],
  tags: {
    deprecated: true,
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
