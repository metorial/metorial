import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailgunClient } from '../lib/client';
import { mailgunServiceError } from '../lib/errors';
import { spec } from '../spec';

let mailingListSchema = z.object({
  address: z.string().describe('Mailing list email address'),
  name: z.string().describe('Mailing list display name'),
  description: z.string().describe('Mailing list description'),
  accessLevel: z.string().describe('Access level (readonly, members, everyone)'),
  replyPreference: z.string().describe('Reply preference (list or sender)'),
  membersCount: z.number().describe('Number of members'),
  createdAt: z.string().describe('Creation timestamp')
});

let memberSchema = z.object({
  address: z.string().describe('Member email address'),
  name: z.string().describe('Member name'),
  subscribed: z.boolean().describe('Whether the member is subscribed'),
  vars: z.record(z.string(), z.unknown()).optional().describe('Custom member variables')
});

// ==================== List Mailing Lists ====================

export let listMailingLists = SlateTool.create(spec, {
  name: 'List Mailing Lists',
  key: 'list_mailing_lists',
  description: `List all mailing lists in the account. Returns list addresses, names, member counts, and access levels.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of lists to return'),
      skip: z.number().optional().describe('Number of lists to skip for pagination')
    })
  )
  .output(
    z.object({
      mailingLists: z.array(mailingListSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listMailingLists({
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });

    let mailingLists = (result.items || []).map(l => ({
      address: l.address,
      name: l.name,
      description: l.description,
      accessLevel: l.access_level,
      replyPreference: l.reply_preference,
      membersCount: l.members_count,
      createdAt: l.created_at
    }));

    return {
      output: { mailingLists },
      message: `Found **${mailingLists.length}** mailing list(s).`
    };
  })
  .build();

// ==================== Get Mailing List ====================

export let getMailingList = SlateTool.create(spec, {
  name: 'Get Mailing List',
  key: 'get_mailing_list',
  description: `Get one Mailgun mailing list by address, including access level, reply preference, and member count.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list')
    })
  )
  .output(
    z.object({
      mailingList: mailingListSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getMailingList(ctx.input.listAddress);

    return {
      output: {
        mailingList: {
          address: result.list.address,
          name: result.list.name,
          description: result.list.description,
          accessLevel: result.list.access_level,
          replyPreference: result.list.reply_preference,
          membersCount: result.list.members_count,
          createdAt: result.list.created_at
        }
      },
      message: `Retrieved mailing list **${result.list.address}**.`
    };
  })
  .build();

// ==================== Create Mailing List ====================

export let createMailingList = SlateTool.create(spec, {
  name: 'Create Mailing List',
  key: 'create_mailing_list',
  description: `Create a new mailing list. Mailing lists can be used as recipients when sending messages. Members can be added after creation.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      address: z.string().describe('Email address for the list (e.g. "devs@mg.example.com")'),
      name: z.string().optional().describe('Display name for the list'),
      description: z.string().optional().describe('Description of the list'),
      accessLevel: z
        .enum(['readonly', 'members', 'everyone'])
        .optional()
        .describe('Who can post to the list (default: readonly)'),
      replyPreference: z
        .enum(['list', 'sender'])
        .optional()
        .describe('Reply-to preference (default: list)')
    })
  )
  .output(
    z.object({
      mailingList: mailingListSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.createMailingList({
      address: ctx.input.address,
      name: ctx.input.name,
      description: ctx.input.description,
      accessLevel: ctx.input.accessLevel,
      replyPreference: ctx.input.replyPreference
    });

    return {
      output: {
        mailingList: {
          address: result.list.address,
          name: result.list.name,
          description: result.list.description,
          accessLevel: result.list.access_level,
          replyPreference: result.list.reply_preference,
          membersCount: result.list.members_count,
          createdAt: result.list.created_at
        }
      },
      message: `Mailing list **${result.list.address}** created.`
    };
  })
  .build();

// ==================== Update Mailing List ====================

export let updateMailingList = SlateTool.create(spec, {
  name: 'Update Mailing List',
  key: 'update_mailing_list',
  description: `Update an existing mailing list's properties including name, description, access level, and reply preference.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      listAddress: z.string().describe('Current email address of the mailing list'),
      newAddress: z.string().optional().describe('New email address for the list'),
      name: z.string().optional().describe('New display name'),
      description: z.string().optional().describe('New description'),
      accessLevel: z
        .enum(['readonly', 'members', 'everyone'])
        .optional()
        .describe('New access level'),
      replyPreference: z.enum(['list', 'sender']).optional().describe('New reply preference')
    })
  )
  .output(
    z.object({
      mailingList: mailingListSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.updateMailingList(ctx.input.listAddress, {
      address: ctx.input.newAddress,
      name: ctx.input.name,
      description: ctx.input.description,
      accessLevel: ctx.input.accessLevel,
      replyPreference: ctx.input.replyPreference
    });

    return {
      output: {
        mailingList: {
          address: result.list.address,
          name: result.list.name,
          description: result.list.description,
          accessLevel: result.list.access_level,
          replyPreference: result.list.reply_preference,
          membersCount: result.list.members_count,
          createdAt: result.list.created_at
        }
      },
      message: `Mailing list **${result.list.address}** updated.`
    };
  })
  .build();

// ==================== Delete Mailing List ====================

export let deleteMailingList = SlateTool.create(spec, {
  name: 'Delete Mailing List',
  key: 'delete_mailing_list',
  description: `Delete a mailing list and all its members permanently.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteMailingList(ctx.input.listAddress);

    return {
      output: { success: true },
      message: `Mailing list **${ctx.input.listAddress}** deleted.`
    };
  })
  .build();

// ==================== List Members ====================

export let listMailingListMembers = SlateTool.create(spec, {
  name: 'List Mailing List Members',
  key: 'list_mailing_list_members',
  description: `List members of a mailing list. Can filter by subscription status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list'),
      subscribed: z.boolean().optional().describe('Filter by subscription status'),
      limit: z.number().optional().describe('Maximum number of members to return (max 100)'),
      skip: z.number().optional().describe('Number of members to skip for pagination')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.listMailingListMembers(ctx.input.listAddress, {
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      subscribed: ctx.input.subscribed
    });

    let members = (result.items || []).map(m => ({
      address: m.address,
      name: m.name,
      subscribed: m.subscribed,
      vars: m.vars
    }));

    return {
      output: { members },
      message: `Found **${members.length}** member(s) in list **${ctx.input.listAddress}**.`
    };
  })
  .build();

// ==================== Get Member ====================

export let getMailingListMember = SlateTool.create(spec, {
  name: 'Get Mailing List Member',
  key: 'get_mailing_list_member',
  description: `Get a specific member from a Mailgun mailing list, including subscription status and custom variables.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list'),
      memberAddress: z.string().describe('Email address of the member to retrieve')
    })
  )
  .output(
    z.object({
      member: memberSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.getMailingListMember(
      ctx.input.listAddress,
      ctx.input.memberAddress
    );

    return {
      output: {
        member: {
          address: result.member.address,
          name: result.member.name,
          subscribed: result.member.subscribed,
          vars: result.member.vars
        }
      },
      message: `Retrieved member **${result.member.address}** from **${ctx.input.listAddress}**.`
    };
  })
  .build();

// ==================== Add/Update Member ====================

export let addMailingListMember = SlateTool.create(spec, {
  name: 'Add Mailing List Member',
  key: 'add_mailing_list_member',
  description: `Add a new member to a mailing list or update an existing member using the upsert option.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list'),
      memberAddress: z.string().describe('Email address of the member to add'),
      name: z.string().optional().describe('Member display name'),
      vars: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom member variables (JSON metadata)'),
      subscribed: z
        .boolean()
        .optional()
        .describe('Whether the member is subscribed (default: true)'),
      upsert: z
        .boolean()
        .optional()
        .describe('If true, update existing member instead of erroring')
    })
  )
  .output(
    z.object({
      member: memberSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.addMailingListMember(ctx.input.listAddress, {
      address: ctx.input.memberAddress,
      name: ctx.input.name,
      vars: ctx.input.vars,
      subscribed: ctx.input.subscribed,
      upsert: ctx.input.upsert
    });

    return {
      output: {
        member: {
          address: result.member.address,
          name: result.member.name,
          subscribed: result.member.subscribed,
          vars: result.member.vars
        }
      },
      message: `Member **${result.member.address}** added to list **${ctx.input.listAddress}**.`
    };
  })
  .build();

// ==================== Update Member ====================

export let updateMailingListMember = SlateTool.create(spec, {
  name: 'Update Mailing List Member',
  key: 'update_mailing_list_member',
  description: `Update a Mailgun mailing list member's display name, custom variables, or subscription status.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list'),
      memberAddress: z.string().describe('Email address of the member to update'),
      name: z.string().optional().describe('Updated display name'),
      vars: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom member variables'),
      subscribed: z.boolean().optional().describe('Updated subscription status')
    })
  )
  .output(
    z.object({
      member: memberSchema
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.name === undefined &&
      ctx.input.vars === undefined &&
      ctx.input.subscribed === undefined
    ) {
      throw mailgunServiceError('Provide at least one member field to update.');
    }

    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.updateMailingListMember(
      ctx.input.listAddress,
      ctx.input.memberAddress,
      {
        name: ctx.input.name,
        vars: ctx.input.vars,
        subscribed: ctx.input.subscribed
      }
    );

    return {
      output: {
        member: {
          address: result.member.address,
          name: result.member.name,
          subscribed: result.member.subscribed,
          vars: result.member.vars
        }
      },
      message: `Updated member **${result.member.address}** in **${ctx.input.listAddress}**.`
    };
  })
  .build();

// ==================== Remove Member ====================

export let removeMailingListMember = SlateTool.create(spec, {
  name: 'Remove Mailing List Member',
  key: 'remove_mailing_list_member',
  description: `Remove a member from a mailing list.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      listAddress: z.string().describe('Email address of the mailing list'),
      memberAddress: z.string().describe('Email address of the member to remove')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailgunClient({ token: ctx.auth.token, region: ctx.config.region });
    await client.deleteMailingListMember(ctx.input.listAddress, ctx.input.memberAddress);

    return {
      output: { success: true },
      message: `Member **${ctx.input.memberAddress}** removed from list **${ctx.input.listAddress}**.`
    };
  })
  .build();
