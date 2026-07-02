import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let updateSecurity = SlateTool.create(spec, {
  name: 'Update Security Settings',
  key: 'update_security',
  description: `Update the security configuration for a NextDNS profile. Toggle threat protection features such as AI threat detection, Google Safe Browsing, cryptojacking protection, DNS rebinding protection, and more. You can also manage the list of blocked TLDs (e.g., \`.ru\`, \`.cn\`). Only provide the fields you want to change.`,
  instructions: [
    'Provide only the toggles you want to change; omitted fields remain unchanged.',
    'To manage blocked TLDs, use the tldsToAdd and tldsToRemove fields.'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile to update'),
      threatIntelligenceFeeds: z
        .boolean()
        .optional()
        .describe('Enable/disable threat intelligence feeds'),
      aiThreatDetection: z
        .boolean()
        .optional()
        .describe('Enable/disable AI-based threat detection'),
      googleSafeBrowsing: z
        .boolean()
        .optional()
        .describe('Enable/disable Google Safe Browsing'),
      cryptojacking: z
        .boolean()
        .optional()
        .describe('Enable/disable cryptojacking protection'),
      dnsRebinding: z.boolean().optional().describe('Enable/disable DNS rebinding protection'),
      idnHomographs: z
        .boolean()
        .optional()
        .describe('Enable/disable IDN homograph protection'),
      typosquatting: z
        .boolean()
        .optional()
        .describe('Enable/disable typosquatting protection'),
      dga: z
        .boolean()
        .optional()
        .describe('Enable/disable DGA (Domain Generation Algorithm) protection'),
      nrd: z
        .boolean()
        .optional()
        .describe('Enable/disable NRD (Newly Registered Domains) blocking'),
      ddns: z.boolean().optional().describe('Enable/disable DDNS blocking'),
      parking: z.boolean().optional().describe('Enable/disable domain parking blocking'),
      csam: z.boolean().optional().describe('Enable/disable CSAM blocking'),
      tldsToAdd: z
        .array(z.string())
        .optional()
        .describe('TLDs to add to the blocked list (e.g., ["ru", "cn"])'),
      tldsToRemove: z
        .array(z.string())
        .optional()
        .describe('TLDs to remove from the blocked list')
    })
  )
  .output(
    z.object({
      security: z.record(z.string(), z.unknown()).describe('Updated security configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let { profileId, tldsToAdd, tldsToRemove, ...securityToggles } = ctx.input;

    let filteredToggles: Record<string, unknown> = {};
    for (let [key, value] of Object.entries(securityToggles)) {
      if (value !== undefined) {
        filteredToggles[key] = value;
      }
    }

    if (Object.keys(filteredToggles).length > 0) {
      await client.updateSecurity(profileId, filteredToggles);
    }

    if (tldsToAdd && tldsToAdd.length > 0) {
      for (let tld of tldsToAdd) {
        await client.addBlockedTld(profileId, tld);
      }
    }

    if (tldsToRemove && tldsToRemove.length > 0) {
      for (let tld of tldsToRemove) {
        await client.removeBlockedTld(profileId, tld);
      }
    }

    let security = await client.getSecurity(profileId);

    return {
      output: { security: security.data || security },
      message: `Updated security settings for profile \`${profileId}\`.`
    };
  })
  .build();
