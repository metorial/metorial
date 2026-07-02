import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfileTool = SlateTool.create(spec, {
  name: 'Get User Profile',
  key: 'get_user_profile',
  description: `Retrieve the authenticated user's Exist profile including username, timezone, and measurement unit preferences (imperial vs metric for distance, weight, energy, liquid, temperature).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      username: z.string().describe('Exist username'),
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      avatarUrl: z.string().describe('URL to the user avatar image'),
      timezone: z.string().describe('User timezone'),
      imperialDistance: z
        .boolean()
        .describe('Whether the user prefers imperial distance units'),
      imperialWeight: z.boolean().describe('Whether the user prefers imperial weight units'),
      imperialEnergy: z.boolean().describe('Whether the user prefers imperial energy units'),
      imperialLiquid: z.boolean().describe('Whether the user prefers imperial liquid units'),
      imperialTemperature: z
        .boolean()
        .describe('Whether the user prefers imperial temperature units')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let profile = await client.getProfile();

    return {
      output: {
        username: profile.username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        avatarUrl: profile.avatar,
        timezone: profile.timezone,
        imperialDistance: profile.imperial_distance,
        imperialWeight: profile.imperial_weight,
        imperialEnergy: profile.imperial_energy,
        imperialLiquid: profile.imperial_liquid,
        imperialTemperature: profile.imperial_temperature
      },
      message: `Retrieved profile for **${profile.username}** (timezone: ${profile.timezone}).`
    };
  })
  .build();
