import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let classifyData = SlateTool.create(spec, {
  name: 'Classify Data',
  key: 'classify_data',
  description: `Use AI to analyze and classify data values in real time.

- **Entity type**: Determine whether a value is a name, company, location, email, phone number, website, or text.
- **Gender**: Infer likely gender from an individual name, including international character sets.
- **Name origin**: Determine the likely cultural/ethnic country of origin from an individual name.
- **Language**: Detect the language of a text input (supports Latin, Japanese, Chinese, Arabic, Greek, and more).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      classificationType: z
        .enum(['entity_type', 'gender', 'name_origin', 'language'])
        .describe('Type of classification to perform'),
      value: z.string().describe('The data value to classify')
    })
  )
  .output(
    z.object({
      classification: z
        .string()
        .describe(
          'The classification result (entity type, gender, origin country, or language)'
        ),
      code: z.string().describe('API response status code'),
      remainingCredits: z.number().describe('Remaining API credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let classification: string;
    let code: string;
    let credits: number;

    switch (ctx.input.classificationType) {
      case 'entity_type': {
        let r = await client.getEntityType(ctx.input.value);
        classification = r.EntityType;
        code = r.Code;
        credits = r.Credits;
        break;
      }
      case 'gender': {
        let r = await client.getGender(ctx.input.value);
        classification = r.Gender;
        code = r.Code;
        credits = r.Credits;
        break;
      }
      case 'name_origin': {
        let r = await client.getNameOrigin(ctx.input.value);
        classification = r.Origin;
        code = r.Code;
        credits = r.Credits;
        break;
      }
      case 'language': {
        let r = await client.identifyLanguage(ctx.input.value);
        classification = r.Language;
        code = r.Code;
        credits = r.Credits;
        break;
      }
    }

    return {
      output: {
        classification,
        code,
        remainingCredits: credits
      },
      message: `Classified "${ctx.input.value}" (${ctx.input.classificationType.replace('_', ' ')}): **${classification}**`
    };
  })
  .build();
