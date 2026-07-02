import { SlateTool } from 'slates';
import { z } from 'zod';
import { PushoverClient } from '../lib/client';
import { spec } from '../spec';

export let listSounds = SlateTool.create(spec, {
  name: 'List Sounds',
  key: 'list_sounds',
  description: `List all available notification sounds for the application, including built-in and custom-uploaded sounds. Use the sound identifier when sending notifications with a custom sound.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sounds: z
        .array(
          z.object({
            soundId: z
              .string()
              .describe(
                'Sound identifier to use in the sound parameter when sending notifications'
              ),
            name: z.string().describe('Human-readable sound description')
          })
        )
        .describe('Available notification sounds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PushoverClient({
      token: ctx.auth.token,
      userKey: ctx.auth.userKey
    });

    let result = await client.listSounds();

    let sounds = Object.entries(result.sounds).map(([soundId, name]) => ({
      soundId,
      name
    }));

    return {
      output: {
        sounds
      },
      message: `Found **${sounds.length}** available sound(s).`
    };
  })
  .build();
