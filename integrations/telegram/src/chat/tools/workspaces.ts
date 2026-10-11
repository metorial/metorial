import {
  ChatErrors,
  getAuthenticatedUser,
  getWorkspace,
  listWorkspaces,
  matchesChatQuery
} from '@slates/adapter-chat';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { assertNoCursor } from '../lib/ids';
import {
  buildTelegramWorkspace,
  mapTelegramUser,
  resolveTelegramBot,
  telegramWorkspaceId
} from '../lib/mappers';

export let chatListWorkspaces = listWorkspaces
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = listWorkspaces.key;
    assertNoCursor(ctx.input.cursor, action);
    return withTelegramChatErrors({ action }, async () => {
      let bot = await resolveTelegramBot(new TelegramClient(ctx.auth.token), ctx.auth);
      let workspace = buildTelegramWorkspace(bot);
      let matches = matchesChatQuery(ctx.input.query, [
        workspace.name,
        bot.username,
        workspace.id
      ]);
      return {
        output: { workspaces: matches ? [workspace] : [], raw: { botId: bot.id } },
        message: matches
          ? `Found the Telegram bot workspace **${workspace.name}**.`
          : 'No Telegram bot workspace matched the query.'
      };
    });
  })
  .build();

export let chatGetWorkspace = getWorkspace
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = getWorkspace.key;
    return withTelegramChatErrors({ action, workspaceId: ctx.input.workspaceId }, async () => {
      let bot = await resolveTelegramBot(new TelegramClient(ctx.auth.token), ctx.auth);
      if (ctx.input.workspaceId !== telegramWorkspaceId(bot.id)) {
        throw ChatErrors.workspaceNotFound({ action, workspaceId: ctx.input.workspaceId });
      }
      let workspace = buildTelegramWorkspace(bot);
      return {
        output: { workspace, raw: { botId: bot.id } },
        message: `Fetched the Telegram bot workspace **${workspace.name}**.`
      };
    });
  })
  .build();

export let chatGetAuthenticatedUser = getAuthenticatedUser
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = getAuthenticatedUser.key;
    return withTelegramChatErrors({ action }, async () => {
      let me = await new TelegramClient(ctx.auth.token).getMe();
      let botId = String(me.id);
      let author = mapTelegramUser(me, botId);
      return {
        output: {
          author,
          workspace: buildTelegramWorkspace({
            id: botId,
            username: me.username,
            name: author.fullName
          }),
          raw: me
        },
        message: `Connected as Telegram bot **@${me.username ?? botId}**.`
      };
    });
  })
  .build();
