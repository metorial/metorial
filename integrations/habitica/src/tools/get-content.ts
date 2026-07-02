import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let getContent = SlateTool.create(spec, {
  name: 'Get Game Content',
  key: 'get_content',
  description: `Retrieve Habitica's game content data including gear definitions, quest details, pet/mount info, food, hatching potions, spells, and appearance options.
This is a read-only reference useful for looking up valid item keys, quest scroll identifiers, and other game data.`,
  constraints: [
    'Returns a large dataset; consider using a specific content section if possible.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      language: z
        .string()
        .optional()
        .describe('Language code for content (e.g., "en", "fr", "de"). Defaults to English')
    })
  )
  .output(
    z.object({
      contentKeys: z
        .array(z.string())
        .describe('Top-level keys available in the content data'),
      gearCount: z.number().optional().describe('Number of gear items'),
      questCount: z.number().optional().describe('Number of quests'),
      petCount: z.number().optional().describe('Number of pet types'),
      mountCount: z.number().optional().describe('Number of mount types'),
      foodCount: z.number().optional().describe('Number of food types'),
      hatchingPotionCount: z.number().optional().describe('Number of hatching potion types'),
      spellKeys: z.array(z.string()).optional().describe('Available spell/skill keys')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let content = await client.getContent(ctx.input.language);

    let contentKeys = Object.keys(content);
    let gearFlat = content.gear?.flat;
    let quests = content.quests;
    let petInfo = content.petInfo;
    let mountInfo = content.mountInfo;
    let food = content.food;
    let hatchingPotions = content.hatchingPotions;
    let spells = content.spells;

    let spellKeys: string[] = [];
    if (spells && typeof spells === 'object') {
      for (let classKey of Object.keys(spells)) {
        if (typeof spells[classKey] === 'object') {
          spellKeys.push(
            ...Object.keys(spells[classKey]).map((s: string) => `${classKey}.${s}`)
          );
        }
      }
    }

    return {
      output: {
        contentKeys,
        gearCount: gearFlat ? Object.keys(gearFlat).length : undefined,
        questCount: quests ? Object.keys(quests).length : undefined,
        petCount: petInfo ? Object.keys(petInfo).length : undefined,
        mountCount: mountInfo ? Object.keys(mountInfo).length : undefined,
        foodCount: food ? Object.keys(food).length : undefined,
        hatchingPotionCount: hatchingPotions ? Object.keys(hatchingPotions).length : undefined,
        spellKeys
      },
      message: `Retrieved game content with **${contentKeys.length}** sections. Gear: **${gearFlat ? Object.keys(gearFlat).length : 0}**, Quests: **${quests ? Object.keys(quests).length : 0}**, Pets: **${petInfo ? Object.keys(petInfo).length : 0}**`
    };
  })
  .build();
