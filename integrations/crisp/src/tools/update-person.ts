import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { crispServiceError } from '../lib/errors';
import { spec } from '../spec';

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing contact profile in the Crisp CRM. Change email, nickname, phone, segments, custom data, and subscription status in a single call.`,
  instructions: [
    'Segments replace the existing list — include all desired segments.',
    'Custom data is merged with existing data — only provided keys are changed.'
  ]
})
  .input(
    z.object({
      peopleId: z.string().describe('The people profile ID to update'),
      email: z.string().optional().describe('Update contact email'),
      nickname: z.string().optional().describe('Update contact nickname'),
      avatar: z.string().optional().describe('Update contact avatar URL'),
      phone: z.string().optional().describe('Update contact phone number'),
      address: z.string().optional().describe('Update contact address'),
      segments: z
        .array(z.string())
        .optional()
        .describe('Set contact segments (replaces existing)'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Update custom data key-value pairs (merged with existing)'),
      emailSubscribed: z.boolean().optional().describe('Update email subscription status')
    })
  )
  .output(
    z.object({
      peopleId: z.string().describe('People profile ID'),
      updated: z.array(z.string()).describe('List of aspects that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let updated: string[] = [];

    let profile: Record<string, any> = {};
    if (ctx.input.email !== undefined) profile.email = ctx.input.email;
    if (ctx.input.phone !== undefined) profile.phone = ctx.input.phone;
    if (ctx.input.address !== undefined) profile.address = ctx.input.address;
    if (ctx.input.segments !== undefined) profile.segments = ctx.input.segments;
    if (ctx.input.nickname !== undefined || ctx.input.avatar !== undefined) {
      profile.person = {};
      if (ctx.input.nickname !== undefined) profile.person.nickname = ctx.input.nickname;
      if (ctx.input.avatar !== undefined) profile.person.avatar = ctx.input.avatar;
    }

    if (Object.keys(profile).length > 0) {
      await client.updatePeopleProfile(ctx.input.peopleId, profile);
      updated.push('profile');
    }

    if (ctx.input.customData !== undefined) {
      await client.updatePeopleData(ctx.input.peopleId, ctx.input.customData);
      updated.push('customData');
    }

    if (ctx.input.emailSubscribed !== undefined) {
      await client.updatePeopleSubscriptionStatus(ctx.input.peopleId, {
        email: ctx.input.emailSubscribed
      });
      updated.push('subscription');
    }

    if (updated.length === 0) {
      throw crispServiceError('Provide at least one contact field to update.');
    }

    return {
      output: {
        peopleId: ctx.input.peopleId,
        updated
      },
      message: `Updated contact **${ctx.input.peopleId}**: ${updated.join(', ')}.`
    };
  })
  .build();
