import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

let serviceEntry = z.object({
  serviceId: z
    .string()
    .describe(
      'Service identifier (e.g., "tiktok", "facebook", "instagram", "snapchat", "twitter")'
    ),
  active: z.boolean().default(true).describe('Whether blocking is active for this service')
});

let categoryEntry = z.object({
  categoryId: z
    .string()
    .describe(
      'Category identifier (e.g., "porn", "gambling", "dating", "piracy", "social-networks", "gaming")'
    ),
  active: z.boolean().default(true).describe('Whether blocking is active for this category')
});

export let updateParentalControl = SlateTool.create(spec, {
  name: 'Update Parental Controls',
  key: 'update_parental_control',
  description: `Update parental control settings for a NextDNS profile. Block specific services (e.g., TikTok, Facebook) and content categories (e.g., porn, gambling), enable SafeSearch and YouTube Restricted Mode, and block bypass methods like VPNs and proxies. Add or remove blocked services and categories incrementally.`,
  instructions: [
    'Services and categories can be toggled active/inactive without removing them.',
    'Use servicesToRemove/categoriesToRemove to fully remove entries from the lists.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile to update'),
      safeSearch: z.boolean().optional().describe('Enable/disable SafeSearch enforcement'),
      youtubeRestrictedMode: z
        .boolean()
        .optional()
        .describe('Enable/disable YouTube Restricted Mode'),
      blockBypass: z
        .boolean()
        .optional()
        .describe('Enable/disable blocking of VPNs, proxies, and other bypass methods'),
      servicesToAdd: z.array(serviceEntry).optional().describe('Services to block'),
      servicesToRemove: z.array(z.string()).optional().describe('Service IDs to unblock'),
      categoriesToAdd: z
        .array(categoryEntry)
        .optional()
        .describe('Content categories to block'),
      categoriesToRemove: z.array(z.string()).optional().describe('Category IDs to unblock')
    })
  )
  .output(
    z.object({
      parentalControl: z
        .record(z.string(), z.unknown())
        .describe('Updated parental control configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let {
      profileId,
      servicesToAdd,
      servicesToRemove,
      categoriesToAdd,
      categoriesToRemove,
      ...toggles
    } = ctx.input;

    let filteredToggles: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(toggles)) {
      if (value !== undefined) {
        filteredToggles[key] = value;
      }
    }

    if (Object.keys(filteredToggles).length > 0) {
      await client.updateParentalControl(profileId, filteredToggles);
    }

    if (servicesToAdd && servicesToAdd.length > 0) {
      for (let svc of servicesToAdd) {
        await client.addBlockedService(profileId, svc.serviceId, svc.active);
      }
    }

    if (servicesToRemove && servicesToRemove.length > 0) {
      for (let id of servicesToRemove) {
        await client.removeBlockedService(profileId, id);
      }
    }

    if (categoriesToAdd && categoriesToAdd.length > 0) {
      for (let cat of categoriesToAdd) {
        await client.addBlockedCategory(profileId, cat.categoryId, cat.active);
      }
    }

    if (categoriesToRemove && categoriesToRemove.length > 0) {
      for (let id of categoriesToRemove) {
        await client.removeBlockedCategory(profileId, id);
      }
    }

    let parentalControl = await client.getParentalControl(profileId);

    return {
      output: { parentalControl: parentalControl.data || parentalControl },
      message: `Updated parental control settings for profile \`${profileId}\`.`
    };
  })
  .build();
