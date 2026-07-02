import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let teamLanguages = SlateTool.create(spec, {
  name: 'Team Language Preferences',
  key: 'team_languages',
  description: `Set preferred or blacklisted languages for a team. Preferred languages auto-create tasks for new videos. Blacklisted languages disallow subtitle creation.`,
  instructions: [
    'Provide a list of BCP-47 language codes.',
    'Setting preferred or blacklisted languages replaces the entire list for that category.'
  ]
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      type: z
        .enum(['preferred', 'blacklisted'])
        .describe('Whether to set preferred or blacklisted languages'),
      languageCodes: z.array(z.string()).describe('List of BCP-47 language codes to set')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the language preferences were updated'),
      type: z.string().describe('Type of languages updated'),
      languageCodes: z.array(z.string()).describe('The language codes that were set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    if (ctx.input.type === 'preferred') {
      await client.setPreferredLanguages(ctx.input.teamSlug, ctx.input.languageCodes);
    } else {
      await client.setBlacklistedLanguages(ctx.input.teamSlug, ctx.input.languageCodes);
    }

    return {
      output: {
        updated: true,
        type: ctx.input.type,
        languageCodes: ctx.input.languageCodes
      },
      message: `Set **${ctx.input.languageCodes.length}** ${ctx.input.type} language(s) for team \`${ctx.input.teamSlug}\`: ${ctx.input.languageCodes.join(', ')}.`
    };
  })
  .build();
