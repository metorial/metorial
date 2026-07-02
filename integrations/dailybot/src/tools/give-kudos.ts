import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let giveKudos = SlateTool.create(spec, {
  name: 'Give Kudos',
  key: 'give_kudos',
  description: `Give peer recognition (kudos) to one or more users. Kudos can optionally be associated with a company value, sent anonymously, or sent on behalf of DailyBot.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      receiverUuids: z.array(z.string()).describe('UUIDs of users to give kudos to'),
      content: z.string().describe('Kudos message text'),
      companyValue: z
        .string()
        .optional()
        .describe('Company value to associate with the kudos'),
      isAnonymous: z
        .boolean()
        .optional()
        .describe('Whether the kudos should be sent anonymously'),
      byDailybot: z
        .boolean()
        .optional()
        .describe('Whether the kudos should be sent on behalf of DailyBot')
    })
  )
  .output(
    z.object({
      kudosId: z.string().optional().describe('ID of the created kudos'),
      content: z.string().describe('Kudos message text'),
      receiverCount: z.number().describe('Number of kudos receivers'),
      raw: z.any().describe('Full kudos object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let kudos = await client.giveKudos({
      receivers: ctx.input.receiverUuids,
      content: ctx.input.content,
      companyValue: ctx.input.companyValue,
      isAnonymous: ctx.input.isAnonymous,
      byDailybot: ctx.input.byDailybot
    });

    return {
      output: {
        kudosId: kudos?.uuid ?? kudos?.id,
        content: ctx.input.content,
        receiverCount: ctx.input.receiverUuids.length,
        raw: kudos
      },
      message: `Kudos sent to **${ctx.input.receiverUuids.length}** user(s).`
    };
  })
  .build();
