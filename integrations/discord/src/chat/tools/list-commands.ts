import { type CommandOptionDefinition, listCommands as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';
import { resolveApplicationId, runDiscordChatAction } from '../lib/context';
import { decodeDiscordCursor, encodeDiscordCursor, offsetCursorSchema } from '../lib/cursors';
import { DISCORD_COMMAND_OPTION_TYPES } from '../lib/interaction';

interface RawOption {
  name: string;
  description?: string;
  type: number;
  required?: boolean;
  choices?: { name: string; value: unknown }[];
  options?: RawOption[];
}

let mapOption = (option: RawOption): CommandOptionDefinition => ({
  name: option.name,
  description: option.description,
  type: DISCORD_COMMAND_OPTION_TYPES[option.type] ?? 'unknown',
  required: option.required,
  choices: option.choices?.map(choice => ({ name: choice.name, value: String(choice.value) })),
  options: option.options?.map(mapOption)
});

export let chatListCommands = contract
  .implement(spec)
  .authMethods(['bot_token'])
  .handleInvocation(async ctx => {
    let action = contract.key;
    let output = await runDiscordChatAction(
      ctx,
      { action, notFound: 'chat.workspace.not_found' },
      async client => {
        let cursor = decodeDiscordCursor(
          ctx.input.cursor,
          'forward',
          offsetCursorSchema,
          action
        );
        let applicationId = await resolveApplicationId(client, ctx.auth);
        let raw = await client.listApplicationCommands(applicationId, ctx.input.workspaceId);
        let query = ctx.input.query?.trim().toLowerCase();

        let commands = raw
          .filter(command => !query || String(command.name).toLowerCase().includes(query))
          .map(command => ({
            name: String(command.name),
            description: command.description || undefined,
            commandId: String(command.id),
            options: (command.options as RawOption[] | undefined)?.map(mapOption),
            raw: command
          }));

        let limit = ctx.input.limit ?? 100;
        let offset = cursor.data?.offset ?? 0;
        let page = commands.slice(offset, offset + limit);
        let nextOffset = offset + page.length;

        return {
          commands: page,
          nextCursor:
            nextOffset < commands.length
              ? encodeDiscordCursor('forward', { offset: nextOffset })
              : undefined,
          raw: { applicationId, total: commands.length }
        };
      }
    );

    return { output, message: `Listed ${output.commands.length} Discord command(s).` };
  })
  .build();
