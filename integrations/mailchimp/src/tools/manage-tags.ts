import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { getSubscriberHash } from '../lib/helpers';
import { spec } from '../spec';

export let manageTagsTool = SlateTool.create(spec, {
  name: 'Manage Member Tags',
  key: 'manage_tags',
  description: `Add or remove tags from a member in an audience, or list a member's current tags. Tags are used to organize and segment contacts. Provide tags with "active" to add or "inactive" to remove.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      emailAddress: z.string().describe('Email address of the member'),
      tagsToAdd: z.array(z.string()).optional().describe('Tag names to add to the member'),
      tagsToRemove: z
        .array(z.string())
        .optional()
        .describe('Tag names to remove from the member')
    })
  )
  .output(
    z.object({
      subscriberHash: z.string(),
      emailAddress: z.string(),
      currentTags: z.array(
        z.object({
          tagId: z.number(),
          name: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let hash = getSubscriberHash(ctx.input.emailAddress);

    let tagUpdates: Array<{ name: string; status: 'active' | 'inactive' }> = [];

    if (ctx.input.tagsToAdd) {
      for (let tag of ctx.input.tagsToAdd) {
        tagUpdates.push({ name: tag, status: 'active' });
      }
    }

    if (ctx.input.tagsToRemove) {
      for (let tag of ctx.input.tagsToRemove) {
        tagUpdates.push({ name: tag, status: 'inactive' });
      }
    }

    if (tagUpdates.length > 0) {
      await client.updateMemberTags(ctx.input.listId, hash, tagUpdates);
    }

    let tagsResult = await client.getMemberTags(ctx.input.listId, hash);
    let currentTags = (tagsResult.tags ?? []).map((t: any) => ({
      tagId: t.id,
      name: t.name
    }));

    let added = ctx.input.tagsToAdd?.length ?? 0;
    let removed = ctx.input.tagsToRemove?.length ?? 0;
    let parts: string[] = [];
    if (added > 0) parts.push(`added ${added} tag(s)`);
    if (removed > 0) parts.push(`removed ${removed} tag(s)`);

    return {
      output: {
        subscriberHash: hash,
        emailAddress: ctx.input.emailAddress,
        currentTags
      },
      message:
        parts.length > 0
          ? `${parts.join(' and ')} for **${ctx.input.emailAddress}**. Now has ${currentTags.length} tag(s).`
          : `**${ctx.input.emailAddress}** has ${currentTags.length} tag(s).`
    };
  })
  .build();
