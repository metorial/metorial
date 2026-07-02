import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaignLanguages = SlateTool.create(spec, {
  name: 'List Campaign Languages',
  key: 'list_campaign_languages',
  description: `Lists MailerLite campaign language IDs and codes. Use these language IDs when creating or updating localized campaigns.`,
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
            languageId: z.string().describe('MailerLite campaign language ID'),
            shortcode: z.string().optional().describe('Short language code'),
            iso639: z.string().optional().describe('ISO 639 locale code'),
            name: z.string().describe('Language name'),
            direction: z.string().optional().describe('Text direction')
          })
        )
        .describe('Available MailerLite campaign languages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCampaignLanguages();
    let languages = (result.data || []).map((language: any) => ({
      languageId: String(language.id),
      shortcode: language.shortcode,
      iso639: language.iso639,
      name: language.name,
      direction: language.direction
    }));

    return {
      output: { languages },
      message: `Retrieved **${languages.length}** MailerLite campaign languages.`
    };
  })
  .build();
