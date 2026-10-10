import {
  listCommands as contract,
  decodeChatCursor,
  encodeCursor
} from '@slates/adapter-chat';
import { z } from 'zod';
import { TelegramClient } from '../../lib/client';
import { spec } from '../../spec';
import { withTelegramChatErrors } from '../lib/errors';
import { TELEGRAM_CHAT_PROVIDER } from '../lib/mappers';

let cursorDataSchema = z.object({ offset: z.number().int().nonnegative() });

let readOffset = (cursor: string | undefined, action: string) => {
  if (!cursor) return 0;
  return decodeChatCursor(TELEGRAM_CHAT_PROVIDER, cursor, cursorDataSchema, { action }).data
    .offset;
};

// Default scope and language only: https://core.telegram.org/bots/api#getmycommands
export let chatListCommands = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let action = contract.key;
    let offset = readOffset(ctx.input.cursor, action);
    return withTelegramChatErrors({ action }, async () => {
      let commands = await new TelegramClient(ctx.auth.token).getMyCommands();
      let query = ctx.input.query?.trim().toLowerCase();
      let filtered = commands.filter(
        command =>
          !query ||
          command.command.toLowerCase().includes(query) ||
          command.description.toLowerCase().includes(query)
      );
      let limit = ctx.input.limit ?? 100;
      let page = filtered.slice(offset, offset + limit);
      let nextOffset = offset + page.length;
      return {
        output: {
          commands: page.map(command => ({
            name: command.command,
            description: command.description,
            raw: command
          })),
          nextCursor:
            nextOffset < filtered.length
              ? encodeCursor(TELEGRAM_CHAT_PROVIDER, {
                  direction: 'forward',
                  data: { offset: nextOffset }
                })
              : undefined,
          raw: { total: filtered.length }
        },
        message: `Found ${page.length} Telegram bot command(s).`
      };
    });
  })
  .build();
