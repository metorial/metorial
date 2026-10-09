import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

// https://docs.discord.com/developers/topics/permissions#permissions-bitwise-permission-flags
let BOT_PERMISSIONS = {
  ADD_REACTIONS: 1n << 6n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n
};

export let DISCORD_BOT_PERMISSIONS = Object.values(BOT_PERMISSIONS)
  .reduce((all, bit) => all | bit, 0n)
  .toString();

let PORTAL = 'https://discord.com/developers/applications';

let OPTION_TYPE_IDS: Record<string, number> = {
  subcommand: 1,
  subcommand_group: 2,
  string: 3,
  integer: 4,
  boolean: 5,
  user: 6,
  channel: 7,
  role: 8,
  mentionable: 9,
  number: 10,
  attachment: 11
};

type SetupCommandOption = {
  name: string;
  description?: string;
  type?: string;
  required?: boolean;
  choices?: { name: string; value: string }[];
  options?: SetupCommandOption[];
};

let toDiscordOption = (option: SetupCommandOption): Record<string, unknown> => ({
  name: option.name,
  description: option.description || option.name,
  type: OPTION_TYPE_IDS[option.type ?? 'string'] ?? 3,
  ...(option.required ? { required: true } : {}),
  ...(option.choices?.length ? { choices: option.choices } : {}),
  ...(option.options?.length ? { options: option.options.map(toDiscordOption) } : {})
});

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName ?? ctx.input.botName ?? 'your app';
    let commands = ctx.input.commands ?? [];
    let installUrl = `https://discord.com/oauth2/authorize?client_id=<APPLICATION_ID>&scope=bot%20applications.commands&permissions=${DISCORD_BOT_PERMISSIONS}`;

    let commandPayload = commands.map(command => ({
      name: command.name.replace(/^\//, ''),
      description: command.description || command.usage || command.name,
      type: 1,
      ...(command.options?.length ? { options: command.options.map(toDiscordOption) } : {})
    }));

    let lines = [
      `# Set up ${appName} on Discord`,
      '',
      `1. Open the [Discord Developer Portal](${PORTAL}) and create an application named **${appName}** (or open the existing one). Copy its **Application ID**.`,
      '2. Open **Bot**, select **Reset Token**, and copy the bot token. Use it for the **Bot Token** connection.',
      '3. On the same **Bot** page, under **Privileged Gateway Intents**, enable **Message Content Intent**. Without it the bot cannot read message text (except DMs and messages that mention it), and the realtime connection is rejected.',
      '4. Open **General Information** and leave **Interactions Endpoint URL** empty. Slash commands are then delivered over the realtime connection and acknowledged automatically.',
      `5. Invite the bot to each server with this URL, replacing \`<APPLICATION_ID>\`:`,
      '',
      `   \`${installUrl}\``,
      '',
      '   It requests the `bot` and `applications.commands` scopes with permission to view channels, read message history, send messages (including in threads), embed links, attach files, and add reactions.',
      '6. Create the connection with the bot token. Realtime events start after the connection is enabled for triggers; each server the bot joins appears as a workspace.'
    ];

    if (commandPayload.length > 0) {
      lines.push(
        '',
        '## Slash commands',
        '',
        `Register the commands below with \`PUT https://discord.com/api/v10/applications/<APPLICATION_ID>/commands\` (header \`Authorization: Bot <BOT_TOKEN>\`, JSON body from the attached definition). Global commands can take up to an hour to appear; use the server-scoped endpoint while testing.`,
        '',
        ...commandPayload.map(command => `- \`/${command.name}\` — ${command.description}`)
      );
    }

    let warnings = [
      'Message Content is a privileged intent. Bots in 100 or more servers need Discord approval for it.',
      'Do not set an Interactions Endpoint URL: Discord then sends slash commands only to that URL and not over the realtime connection.',
      'Direct messages do not belong to a server. When the bot is in several servers, DM events cannot be attributed to one of them.'
    ];
    if (ctx.input.webhookUrl) {
      warnings.push(
        'Discord events are received over a persistent connection opened with the bot token, so the provided webhook URL is not used.'
      );
    }
    if (ctx.input.redirectUris?.length) {
      warnings.push(
        'The bot token connection needs no OAuth redirect URI. Redirect URIs only apply to the separate user OAuth connection, which cannot act as the bot.'
      );
    }

    return {
      output: {
        title: `Discord setup for ${appName}`,
        setupMarkdown: lines.join('\n'),
        manifest:
          commandPayload.length > 0
            ? {
                type: 'Discord Application Commands',
                value: JSON.stringify(commandPayload, null, 2),
                format: 'json' as const,
                filename: 'discord-commands.json'
              }
            : undefined,
        links: [
          {
            label: 'Discord Developer Portal',
            url: PORTAL,
            description: 'Create the application, bot token, and intents.'
          },
          {
            label: 'Gateway intents',
            url: 'https://docs.discord.com/developers/events/gateway#privileged-intents',
            description: 'Why the Message Content intent is required.'
          },
          {
            label: 'Application commands',
            url: 'https://docs.discord.com/developers/interactions/application-commands',
            description: 'Registering slash commands.'
          }
        ],
        warnings
      },
      message: 'Generated Discord setup instructions.'
    };
  })
  .build();
