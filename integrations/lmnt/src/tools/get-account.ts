import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieves your LMNT account details including plan type, character limits, voice limits, and current usage for the billing period.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      planType: z.string().describe('The type of plan you are subscribed to.'),
      characterLimit: z.number().describe('Character limit per billing period.'),
      commercialUseAllowed: z.boolean().describe('Whether commercial use is permitted.'),
      instantVoiceLimit: z.number().describe('Maximum number of instant voices.'),
      professionalVoiceLimit: z
        .number()
        .optional()
        .describe('Maximum number of professional voices.'),
      charactersUsed: z.number().describe('Characters synthesized this billing period.'),
      instantVoicesUsed: z.number().describe('Number of instant voices created.'),
      professionalVoicesUsed: z.number().describe('Number of professional voices created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount();

    return {
      output: {
        planType: account.plan.type,
        characterLimit: account.plan.character_limit,
        commercialUseAllowed: account.plan.commercial_use_allowed,
        instantVoiceLimit: account.plan.instant_voice_limit,
        professionalVoiceLimit: account.plan.professional_voice_limit,
        charactersUsed: account.usage.characters,
        instantVoicesUsed: account.usage.instant_voices,
        professionalVoicesUsed: account.usage.professional_voices
      },
      message: `**${account.plan.type}** plan — ${account.usage.characters}/${account.plan.character_limit} characters used this period. ${account.usage.instant_voices} instant and ${account.usage.professional_voices} professional voices created.`
    };
  })
  .build();
