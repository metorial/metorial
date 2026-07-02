import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let commandTypeMap: Record<string, number> = {
  CHAT_INPUT: 1,
  USER: 2,
  MESSAGE: 3
};

let reverseCommandTypeMap: Record<number, string> = Object.fromEntries(
  Object.entries(commandTypeMap).map(([key, value]) => [value, key])
);

let commandOptionSchema = z
  .record(z.string(), z.any())
  .describe('Raw Discord application command option object');

let applicationCommandSchema = z.object({
  commandId: z.string().describe('Application command ID'),
  applicationId: z.string().describe('Discord application ID'),
  guildId: z.string().nullable().describe('Guild ID for guild-scoped commands'),
  name: z.string().describe('Command name'),
  description: z.string().describe('Command description, or empty for context commands'),
  type: z.string().describe('Command type: CHAT_INPUT, USER, or MESSAGE'),
  version: z.string().optional().describe('Command version snowflake'),
  defaultMemberPermissions: z
    .string()
    .nullable()
    .optional()
    .describe('Default member permissions bitset'),
  nsfw: z.boolean().optional().describe('Whether the command is age-restricted')
});

let formatCommand = (command: any) => ({
  commandId: command.id,
  applicationId: command.application_id,
  guildId: command.guild_id ?? null,
  name: command.name ?? '',
  description: command.description ?? '',
  type: reverseCommandTypeMap[command.type] || String(command.type),
  version: command.version,
  defaultMemberPermissions: command.default_member_permissions ?? null,
  nsfw: command.nsfw
});

let buildCommandPayload = (input: {
  name?: string;
  description?: string;
  commandType?: string;
  options?: Record<string, any>[];
  defaultMemberPermissions?: string | null;
  nsfw?: boolean;
  integrationTypes?: number[];
  contexts?: number[];
}) => {
  let commandType = input.commandType ?? 'CHAT_INPUT';
  let data: Record<string, any> = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.commandType !== undefined) data.type = commandTypeMap[input.commandType];
  if (input.options !== undefined) data.options = input.options;
  if (input.defaultMemberPermissions !== undefined) {
    data.default_member_permissions = input.defaultMemberPermissions;
  }
  if (input.nsfw !== undefined) data.nsfw = input.nsfw;
  if (input.integrationTypes !== undefined) data.integration_types = input.integrationTypes;
  if (input.contexts !== undefined) data.contexts = input.contexts;

  if (input.description !== undefined) {
    if (commandType !== 'CHAT_INPUT') {
      throw discordServiceError('description is only valid for CHAT_INPUT commands');
    }
    data.description = input.description;
  }

  return data;
};

export let manageApplicationCommands = SlateTool.create(spec, {
  name: 'Manage Application Commands',
  key: 'manage_application_commands',
  description:
    'List, get, create, update, or delete Discord application commands at global or guild scope.',
  instructions: [
    'Use **scope** "guild" with a guildId for commands that update immediately in one guild.',
    'Use **scope** "global" for commands available everywhere the app is installed; global propagation can take time.',
    'CHAT_INPUT commands require a description when created. USER and MESSAGE context menu commands do not use descriptions.',
    'Creating a command with the same name and type in the same scope upserts the existing command.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageApplicationCommands)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Application command action to perform'),
      scope: z.enum(['global', 'guild']).describe('Command scope'),
      applicationId: z.string().describe('Discord application ID'),
      guildId: z.string().optional().describe('Guild ID, required when scope is guild'),
      commandId: z
        .string()
        .optional()
        .describe('Command ID, required for get, update, and delete'),
      name: z.string().optional().describe('Command name, required for create'),
      description: z
        .string()
        .optional()
        .describe('Command description for CHAT_INPUT commands'),
      commandType: z
        .enum(['CHAT_INPUT', 'USER', 'MESSAGE'])
        .optional()
        .describe('Application command type, defaults to CHAT_INPUT'),
      options: z
        .array(commandOptionSchema)
        .optional()
        .describe('Application command options, max 25'),
      defaultMemberPermissions: z
        .string()
        .nullable()
        .optional()
        .describe('Default member permissions bitset string, or null'),
      nsfw: z.boolean().optional().describe('Whether the command is age-restricted'),
      integrationTypes: z
        .array(z.number())
        .optional()
        .describe('Installation contexts where the command is available'),
      contexts: z
        .array(z.number())
        .optional()
        .describe('Interaction contexts where the command can be used'),
      withLocalizations: z
        .boolean()
        .optional()
        .describe('Include full localization dictionaries when listing commands')
    })
  )
  .output(
    z.object({
      command: applicationCommandSchema
        .optional()
        .describe('Application command returned by get/create/update'),
      commands: z
        .array(applicationCommandSchema)
        .optional()
        .describe('Application commands returned by list'),
      success: z.boolean().optional().describe('Whether delete succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

    if (input.scope === 'guild' && !input.guildId) {
      throw discordServiceError('guildId is required for guild-scoped commands');
    }

    let isGuildScope = input.scope === 'guild';

    if (input.action === 'list') {
      let commands = isGuildScope
        ? await client.getGuildApplicationCommands(
            input.applicationId,
            input.guildId!,
            input.withLocalizations
          )
        : await client.getGlobalApplicationCommands(
            input.applicationId,
            input.withLocalizations
          );

      let mapped = commands.map(formatCommand);
      return {
        output: { commands: mapped },
        message: `Found ${mapped.length} ${input.scope} application command(s).`
      };
    }

    if (input.action === 'get') {
      if (!input.commandId) {
        throw discordServiceError('commandId is required for get action');
      }

      let command = isGuildScope
        ? await client.getGuildApplicationCommand(
            input.applicationId,
            input.guildId!,
            input.commandId
          )
        : await client.getGlobalApplicationCommand(input.applicationId, input.commandId);

      return {
        output: { command: formatCommand(command) },
        message: `Retrieved ${input.scope} application command \`${input.commandId}\`.`
      };
    }

    if (input.action === 'create') {
      if (!input.name) {
        throw discordServiceError('name is required for create action');
      }

      let commandType = input.commandType ?? 'CHAT_INPUT';
      if (commandType === 'CHAT_INPUT' && !input.description) {
        throw discordServiceError('description is required for CHAT_INPUT commands');
      }

      let payload = buildCommandPayload(input);
      let command = isGuildScope
        ? await client.createGuildApplicationCommand(
            input.applicationId,
            input.guildId!,
            payload
          )
        : await client.createGlobalApplicationCommand(input.applicationId, payload);

      return {
        output: { command: formatCommand(command) },
        message: `Created ${input.scope} application command **${command.name}**.`
      };
    }

    if (input.action === 'update') {
      if (!input.commandId) {
        throw discordServiceError('commandId is required for update action');
      }
      if (input.commandType !== undefined) {
        throw discordServiceError(
          'commandType cannot be updated; delete and recreate the command'
        );
      }

      let payload = buildCommandPayload(input);
      if (Object.keys(payload).length === 0) {
        throw discordServiceError('Provide at least one field to update');
      }

      let command = isGuildScope
        ? await client.editGuildApplicationCommand(
            input.applicationId,
            input.guildId!,
            input.commandId,
            payload
          )
        : await client.editGlobalApplicationCommand(
            input.applicationId,
            input.commandId,
            payload
          );

      return {
        output: { command: formatCommand(command) },
        message: `Updated ${input.scope} application command \`${input.commandId}\`.`
      };
    }

    if (!input.commandId) {
      throw discordServiceError('commandId is required for delete action');
    }

    if (isGuildScope) {
      await client.deleteGuildApplicationCommand(
        input.applicationId,
        input.guildId!,
        input.commandId
      );
    } else {
      await client.deleteGlobalApplicationCommand(input.applicationId, input.commandId);
    }

    return {
      output: { success: true },
      message: `Deleted ${input.scope} application command \`${input.commandId}\`.`
    };
  })
  .build();
