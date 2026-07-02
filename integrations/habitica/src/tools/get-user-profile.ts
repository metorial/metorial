import { SlateTool } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from '../lib/client';
import { spec } from '../spec';

export let getUserProfile = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated user's profile and character stats from Habitica. Returns character level, class, HP, XP, Mana, Gold, and profile information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      habiticaUserId: z.string().describe('User ID'),
      displayName: z.string().optional().describe('User display name'),
      username: z.string().optional().describe('Username'),
      level: z.number().optional().describe('Character level'),
      characterClass: z
        .string()
        .optional()
        .describe('Character class: warrior, rogue, healer, or wizard'),
      hp: z.number().optional().describe('Current health points'),
      maxHp: z.number().optional().describe('Maximum health points'),
      mp: z.number().optional().describe('Current mana points'),
      maxMp: z.number().optional().describe('Maximum mana points'),
      exp: z.number().optional().describe('Current experience points'),
      toNextLevel: z.number().optional().describe('Experience needed for next level'),
      gp: z.number().optional().describe('Current gold'),
      gems: z.number().optional().describe('Current gems (balance * 4)'),
      strength: z.number().optional().describe('Strength stat'),
      intelligence: z.number().optional().describe('Intelligence stat'),
      constitution: z.number().optional().describe('Constitution stat'),
      perception: z.number().optional().describe('Perception stat'),
      sleeping: z.boolean().optional().describe('Whether the user is resting in the inn'),
      partyId: z.string().optional().describe("ID of the user's party")
    })
  )
  .handleInvocation(async ctx => {
    let client = new HabiticaClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token,
      xClient: ctx.config.xClient
    });

    let user = await client.getUser('stats,profile,auth,party,preferences');

    let stats = user.stats || {};
    let profile = user.profile || {};
    let authData = user.auth || {};

    return {
      output: {
        habiticaUserId: ctx.auth.userId,
        displayName: profile.name,
        username: authData.local?.username,
        level: stats.lvl,
        characterClass: stats.class,
        hp: stats.hp,
        maxHp: stats.maxHealth,
        mp: stats.mp,
        maxMp: stats.maxMP,
        exp: stats.exp,
        toNextLevel: stats.toNextLevel,
        gp: stats.gp,
        gems: user.balance ? user.balance * 4 : 0,
        strength: stats.str,
        intelligence: stats.int,
        constitution: stats.con,
        perception: stats.per,
        sleeping: user.preferences?.sleep,
        partyId: user.party?._id
      },
      message: `**${profile.name || authData.local?.username}** - Level **${stats.lvl}** ${stats.class || 'adventurer'}. HP: **${stats.hp?.toFixed(0)}/${stats.maxHealth}**, XP: **${stats.exp?.toFixed(0)}/${stats.toNextLevel}**, Gold: **${stats.gp?.toFixed(2)}**`
    };
  })
  .build();
