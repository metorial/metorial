import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { audioBibleSchema } from './list-audio-bibles';

export let getAudioBible = SlateTool.create(spec, {
  name: 'Get Audio Bible',
  key: 'get_audio_bible',
  description:
    'Retrieve metadata, copyright and publisher information for an audio Bible. Use list_audio_bibles to discover licensed audio Bible IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({ audioBibleId: z.string().describe('Audio Bible ID from list_audio_bibles') })
  )
  .output(audioBibleSchema)
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).getAudioBible(
      ctx.input.audioBibleId
    );
    let b = result.data;
    return {
      output: {
        audioBibleId: b.id,
        name: b.name,
        nameLocal: b.nameLocal,
        description: b.description,
        descriptionLocal: b.descriptionLocal,
        copyright: b.copyright,
        info: b.info,
        language: {
          languageId: b.language.id,
          name: b.language.name,
          nameLocal: b.language.nameLocal,
          script: b.language.script,
          scriptDirection: b.language.scriptDirection
        },
        countries: b.countries.map(c => ({
          countryId: c.id,
          name: c.name,
          nameLocal: c.nameLocal
        })),
        type: b.type,
        updatedAt: b.updatedAt
      },
      message: `Retrieved audio Bible **${b.name}**.`
    };
  })
  .build();
