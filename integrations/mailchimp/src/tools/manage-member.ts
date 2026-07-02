import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { getSubscriberHash } from '../lib/helpers';
import { spec } from '../spec';

export let manageMemberTool = SlateTool.create(spec, {
  name: 'Manage Member',
  key: 'manage_member',
  description: `Add, update, or remove a member (contact) in an audience. Supports subscribe, unsubscribe, update profile/merge fields, archive, and permanent delete. Uses email address to identify members (MD5 hash is computed automatically).`,
  instructions: [
    'To add a new member, provide listId, emailAddress, and status.',
    'To update, provide listId and emailAddress with the fields to change. The member will be created if they do not exist (upsert).',
    'To archive a member, set action to "archive". To permanently delete, set action to "delete_permanent".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('Audience ID'),
      emailAddress: z.string().describe('Email address of the member'),
      action: z
        .enum(['upsert', 'archive', 'delete_permanent'])
        .optional()
        .describe('Action to perform. Default is "upsert" (add or update).'),
      status: z
        .enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'])
        .optional()
        .describe('Subscription status'),
      statusIfNew: z
        .enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional'])
        .optional()
        .describe('Status for new members when upserting (defaults to status)'),
      mergeFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Merge field values (e.g., {"FNAME": "Jane", "LNAME": "Doe"})'),
      language: z.string().optional().describe('Subscriber language code'),
      vip: z.boolean().optional().describe('VIP status'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Tags to add to the member (only applied on create)')
    })
  )
  .output(
    z.object({
      subscriberHash: z.string(),
      emailAddress: z.string(),
      status: z.string(),
      fullName: z.string().optional(),
      archived: z.boolean().optional(),
      permanentlyDeleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let hash = getSubscriberHash(ctx.input.emailAddress);
    let action = ctx.input.action ?? 'upsert';

    if (action === 'archive') {
      await client.archiveMember(ctx.input.listId, hash);
      return {
        output: {
          subscriberHash: hash,
          emailAddress: ctx.input.emailAddress,
          status: 'archived',
          archived: true
        },
        message: `Member **${ctx.input.emailAddress}** has been archived from audience ${ctx.input.listId}.`
      };
    }

    if (action === 'delete_permanent') {
      await client.deleteMemberPermanent(ctx.input.listId, hash);
      return {
        output: {
          subscriberHash: hash,
          emailAddress: ctx.input.emailAddress,
          status: 'deleted',
          permanentlyDeleted: true
        },
        message: `Member **${ctx.input.emailAddress}** has been permanently deleted from audience ${ctx.input.listId}.`
      };
    }

    // Upsert
    let data: Record<string, any> = {
      email_address: ctx.input.emailAddress
    };
    if (ctx.input.status) data.status = ctx.input.status;
    if (ctx.input.statusIfNew) data.status_if_new = ctx.input.statusIfNew;
    else if (ctx.input.status) data.status_if_new = ctx.input.status;
    if (ctx.input.mergeFields) data.merge_fields = ctx.input.mergeFields;
    if (ctx.input.language) data.language = ctx.input.language;
    if (ctx.input.vip !== undefined) data.vip = ctx.input.vip;
    if (ctx.input.tags) data.tags = ctx.input.tags;

    let result = await client.upsertMember(ctx.input.listId, hash, data);

    return {
      output: {
        subscriberHash: result.id,
        emailAddress: result.email_address,
        status: result.status,
        fullName: result.full_name || undefined
      },
      message: `Member **${result.email_address}** is now **${result.status}** in audience ${ctx.input.listId}.`
    };
  })
  .build();
