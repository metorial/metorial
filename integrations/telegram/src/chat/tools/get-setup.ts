import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

// BotFather command lists use `command - description`, one per line, with
// lowercase command names of up to 32 letters, digits, and underscores.
// https://core.telegram.org/bots/features#commands
let commandName = (name: string) =>
  name
    .replace(/^\//, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 32);

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName ?? 'My Telegram Bot';
    let botName = ctx.input.botName ?? 'my_telegram_bot';
    let description = ctx.input.description;
    let commands = ctx.input.commands ?? [];
    let commandList = commands
      .map(command => {
        let detail = command.description ?? command.usage ?? command.name;
        return `${commandName(command.name)} - ${detail.slice(0, 256)}`;
      })
      .join('\n');

    let warnings = [
      'A Telegram bot has a single webhook. Enabling events replaces any webhook already set for this bot, and polling with getUpdates stops working while it is active.',
      'In groups with privacy mode enabled (the default), the bot only receives commands, messages that mention it, and replies to its own messages.',
      'Reaction and member events in groups and channels are only delivered while the bot is an administrator of that chat.',
      'Telegram has no message deletion events, so deleted messages are not reported.'
    ];
    if (ctx.input.redirectUris?.length) {
      warnings.push(
        'Telegram bots authenticate with a bot token; OAuth redirect URIs are not used.'
      );
    }
    if (ctx.input.webhookUrl) {
      warnings.push(
        'The webhook is registered automatically when events are enabled; the supplied webhook URL does not need to be entered in Telegram.'
      );
    }

    let steps = [
      `# ${appName} Telegram setup`,
      '',
      '1. Open a chat with [@BotFather](https://t.me/BotFather) and send `/newbot`.',
      `2. Enter the display name **${appName}**, then a username that ends in \`bot\` (for example \`${botName.replace(/^@/, '')}\`${/bot$/i.test(botName) ? '' : '_bot'}).`,
      '3. Copy the bot token BotFather returns and use it to connect this integration. Keep the token secret; anyone with it controls the bot.',
      description
        ? `4. Optional: send \`/setdescription\` to BotFather and enter: ${description}`
        : '4. Optional: send `/setdescription` and `/setuserpic` to BotFather to describe the bot.',
      '5. To receive every message in groups, send `/setprivacy` to BotFather, choose the bot, and select **Disable**. Re-add the bot to existing groups afterwards for the change to apply.',
      '6. Add the bot to the groups or channels it should work in. Make it an administrator to receive reaction and member events, and to post in channels.',
      commands.length
        ? '7. Send `/setcommands` to BotFather, choose the bot, and paste the command list below.'
        : '7. Optional: send `/setcommands` to BotFather to register commands users can pick from the menu.',
      '8. Enable events for the connection. The webhook is registered with Telegram automatically and verified with a generated secret token.'
    ];

    return {
      output: {
        title: `${appName} Telegram setup`,
        setupMarkdown: steps.join('\n'),
        manifest: commands.length
          ? {
              type: 'Telegram BotFather Command List',
              value: commandList,
              format: 'text' as const,
              filename: 'botfather-commands.txt'
            }
          : undefined,
        links: [
          { label: 'BotFather', url: 'https://t.me/BotFather' },
          {
            label: 'BotFather commands',
            url: 'https://core.telegram.org/bots/features#botfather'
          },
          {
            label: 'Privacy mode',
            url: 'https://core.telegram.org/bots/features#privacy-mode'
          },
          { label: 'Bot API reference', url: 'https://core.telegram.org/bots/api' }
        ],
        warnings
      },
      message: 'Generated Telegram bot setup instructions.'
    };
  })
  .build();
