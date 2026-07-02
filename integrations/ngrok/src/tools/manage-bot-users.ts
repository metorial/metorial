import { SlateTool } from 'slates';
import { z } from 'zod';
import { NgrokClient } from '../lib/client';
import { spec } from '../spec';

let botUserOutputSchema = z.object({
  botUserId: z.string().describe('Bot user ID'),
  uri: z.string().describe('API resource URI'),
  name: z.string().describe('Bot user name'),
  active: z.boolean().describe('Whether the bot user is active'),
  createdAt: z.string().describe('Creation timestamp')
});

let mapBotUser = (b: any) => ({
  botUserId: b.id,
  uri: b.uri || '',
  name: b.name || '',
  active: b.active ?? true,
  createdAt: b.created_at || ''
});

export let listBotUsers = SlateTool.create(spec, {
  name: 'List Bot Users',
  key: 'list_bot_users',
  description: `List all bot users (service accounts). Bot users provide programmatic API access separate from human user accounts. API keys and authtokens can be assigned to bot users.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      beforeId: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Max results per page')
    })
  )
  .output(
    z.object({
      botUsers: z.array(botUserOutputSchema),
      nextPageUri: z.string().optional().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let result = await client.listBotUsers({
      beforeId: ctx.input.beforeId,
      limit: ctx.input.limit
    });
    let botUsers = (result.bot_users || []).map(mapBotUser);
    return {
      output: { botUsers, nextPageUri: result.next_page_uri || null },
      message: `Found **${botUsers.length}** bot user(s).`
    };
  })
  .build();

export let getBotUser = SlateTool.create(spec, {
  name: 'Get Bot User',
  key: 'get_bot_user',
  description: `Retrieve details of a specific bot user (service account) by ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      botUserId: z.string().describe('Bot user ID (e.g., bot_xxx)')
    })
  )
  .output(botUserOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let b = await client.getBotUser(ctx.input.botUserId);
    return {
      output: mapBotUser(b),
      message: `Retrieved bot user **${b.name}** (${b.id}).`
    };
  })
  .build();

export let createBotUser = SlateTool.create(spec, {
  name: 'Create Bot User',
  key: 'create_bot_user',
  description: `Create a new bot user (service account) for programmatic API access. After creation, assign API keys or authtokens to the bot user.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Bot user name'),
      active: z.boolean().optional().describe('Whether the bot user is active (default true)')
    })
  )
  .output(botUserOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let b = await client.createBotUser({
      name: ctx.input.name,
      active: ctx.input.active
    });
    return {
      output: mapBotUser(b),
      message: `Created bot user **${b.name}** (${b.id}).`
    };
  })
  .build();

export let updateBotUser = SlateTool.create(spec, {
  name: 'Update Bot User',
  key: 'update_bot_user',
  description: `Update a bot user's name or active status.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      botUserId: z.string().describe('Bot user ID to update'),
      name: z.string().optional().describe('New name'),
      active: z.boolean().optional().describe('New active status')
    })
  )
  .output(botUserOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    let b = await client.updateBotUser(ctx.input.botUserId, {
      name: ctx.input.name,
      active: ctx.input.active
    });
    return {
      output: mapBotUser(b),
      message: `Updated bot user **${b.name}** (${b.id}).`
    };
  })
  .build();

export let deleteBotUser = SlateTool.create(spec, {
  name: 'Delete Bot User',
  key: 'delete_bot_user',
  description: `Delete a bot user. All API keys and authtokens owned by this bot user will be revoked.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      botUserId: z.string().describe('Bot user ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new NgrokClient(ctx.auth.token);
    await client.deleteBotUser(ctx.input.botUserId);
    return {
      output: { success: true },
      message: `Deleted bot user **${ctx.input.botUserId}**.`
    };
  })
  .build();
