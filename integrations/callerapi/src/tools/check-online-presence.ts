import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let presenceStatusSchema = z
  .number()
  .optional()
  .describe('1 = active, 0 = inactive, -1 = unable to determine');

export let checkOnlinePresence = SlateTool.create(spec, {
  name: 'Check Online Presence',
  key: 'check_online_presence',
  description: `Check if a phone number is linked to various online platforms and services including WhatsApp, Telegram, Amazon, Google, Office 365, Instagram, LinkedIn, Twitter, Skype, and Viber. Returns the presence status for each platform.`,
  instructions: [
    'Phone numbers must be in E.164 format (e.g., +16502530000)',
    'Platform availability may vary by country; some platforms are only available in specific regions',
    'Status values: 1 = active, 0 = inactive, -1 = unable to determine'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +16502530000)')
    })
  )
  .output(
    z.object({
      whatsapp: presenceStatusSchema.describe('WhatsApp presence status'),
      telegram: presenceStatusSchema.describe('Telegram presence status'),
      amazon: presenceStatusSchema.describe('Amazon presence status'),
      google: presenceStatusSchema.describe('Google presence status'),
      office365: presenceStatusSchema.describe('Office 365 presence status'),
      instagram: presenceStatusSchema.describe('Instagram presence status'),
      linkedin: presenceStatusSchema.describe('LinkedIn presence status'),
      twitter: presenceStatusSchema.describe('Twitter presence status'),
      skype: presenceStatusSchema.describe('Skype presence status'),
      viber: presenceStatusSchema.describe('Viber presence status'),
      status: z.number().optional().describe('Status code (0 = success)'),
      statusMessage: z.string().optional().describe('Status message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getOnlinePresence(ctx.input.phoneNumber);

    let presence = result.online_presence || result;

    let activePlatforms = Object.entries(presence)
      .filter(([key, val]) => val === 1 && !['status', 'status_message'].includes(key))
      .map(([key]) => key);

    return {
      output: {
        whatsapp: presence.whatsapp,
        telegram: presence.telegram,
        amazon: presence.amazon,
        google: presence.google,
        office365: presence.office365,
        instagram: presence.instagram,
        linkedin: presence.linkedin,
        twitter: presence.twitter,
        skype: presence.skype,
        viber: presence.viber,
        status: result.status,
        statusMessage: result.status_message
      },
      message:
        activePlatforms.length > 0
          ? `Phone number **${ctx.input.phoneNumber}** is active on: **${activePlatforms.join(', ')}**.`
          : `No active online presence detected for **${ctx.input.phoneNumber}**.`
    };
  })
  .build();
