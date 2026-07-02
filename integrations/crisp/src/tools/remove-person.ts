import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removePerson = SlateTool.create(spec, {
  name: 'Remove Person',
  key: 'remove_person',
  description: `Permanently remove a contact profile from the Crisp CRM. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      peopleId: z.string().describe('The people profile ID to remove')
    })
  )
  .output(
    z.object({
      peopleId: z.string().describe('People profile ID of the removed contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    await client.removePeopleProfile(ctx.input.peopleId);

    return {
      output: { peopleId: ctx.input.peopleId },
      message: `Removed contact **${ctx.input.peopleId}**.`
    };
  })
  .build();
