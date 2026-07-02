import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let castSkill = SlateTool.create(spec, {
  name: 'Cast Skill',
  key: 'cast_skill',
  description: `Cast a class-specific skill (spell) in Habitica. Skills consume mana and have various effects based on the user's class and stats.

**Warrior** skills: smash, defensiveStance, valorousPresence, intimidate
**Mage** skills: fireball, mpheal, earth, frost
**Rogue** skills: pickPocket, backStab, toolsOfTrade, stealth
**Healer** skills: heal, brightness, protectAura, healAll

Some skills require a target (task ID or user ID), while others are self-cast or party-wide.`,
  instructions: [
    'The user must have sufficient mana to cast the skill.',
    'Skills like "backStab" and "fireball" require a targetId (task ID).',
    'Party-wide skills like "healAll" do not need a targetId.',
    'Skills cannot be cast on challenge tasks.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spellId: z
        .string()
        .describe('Skill identifier (e.g., "fireball", "heal", "backStab", "pickPocket")'),
      targetId: z
        .string()
        .optional()
        .describe('Target task ID or user ID, required for targeted skills')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the skill was cast successfully'),
      userStats: z
        .object({
          hp: z.number().optional().describe('Updated HP'),
          mp: z.number().optional().describe('Updated mana'),
          exp: z.number().optional().describe('Updated experience'),
          gp: z.number().optional().describe('Updated gold'),
          lvl: z.number().optional().describe('Updated level')
        })
        .optional()
        .describe('Updated user stats after casting')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let result = await client.castSkill(ctx.input.spellId, ctx.input.targetId);

    let userStats = result.user?.stats || result;

    return {
      output: {
        success: true,
        userStats: {
          hp: userStats.hp,
          mp: userStats.mp,
          exp: userStats.exp,
          gp: userStats.gp,
          lvl: userStats.lvl
        }
      },
      message: `Cast skill **${ctx.input.spellId}**${ctx.input.targetId ? ` on target **${ctx.input.targetId}**` : ''}. Mana: **${userStats.mp?.toFixed(0)}**`
    };
  })
  .build();
