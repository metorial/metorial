import { randomUUID } from 'node:crypto';
import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

// https://learn.microsoft.com/en-us/microsoft-365/extensibility/schema/root-bots
// https://learn.microsoft.com/en-us/microsoftteams/platform/agents-in-teams/enable-receive-all-chat-messages
let MANIFEST_VERSION = '1.30';
let MANIFEST_SCHEMA = `https://developer.microsoft.com/json-schemas/teams/v${MANIFEST_VERSION}/MicrosoftTeams.schema.json`;
let APP_ID_PLACEHOLDER = '00000000-0000-0000-0000-000000000000';

let truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName?.trim() || 'Teams Chat Bot';
    let botName = ctx.input.botName?.trim() || appName;
    let description =
      ctx.input.description?.trim() ||
      'A Microsoft Teams bot that reads and sends chat messages.';
    let webhookUrl = ctx.input.webhookUrl?.trim();
    let commands = (ctx.input.commands ?? []).slice(0, 12);
    let warnings: string[] = [];

    if (!webhookUrl) {
      warnings.push(
        'No messaging endpoint was supplied. Use the receive URL shown when you set up event delivery for this connection.'
      );
    }
    if ((ctx.input.commands ?? []).length > 12) {
      warnings.push(
        'Teams accepts at most 12 commands per command list; extra commands were left out.'
      );
    }

    let manifest = {
      $schema: MANIFEST_SCHEMA,
      manifestVersion: MANIFEST_VERSION,
      version: '1.0.0',
      id: randomUUID(),
      developer: {
        name: 'YOUR_COMPANY',
        websiteUrl: 'https://YOUR_DOMAIN',
        privacyUrl: 'https://YOUR_DOMAIN/privacy',
        termsOfUseUrl: 'https://YOUR_DOMAIN/terms'
      },
      name: { short: truncate(appName, 30), full: truncate(appName, 100) },
      description: { short: truncate(description, 80), full: truncate(description, 4000) },
      icons: { color: 'color.png', outline: 'outline.png' },
      accentColor: '#4F52B2',
      bots: [
        {
          botId: APP_ID_PLACEHOLDER,
          scopes: ['personal', 'team', 'groupChat'],
          supportsFiles: true,
          isNotificationOnly: false,
          ...(commands.length > 0
            ? {
                commandLists: [
                  {
                    scopes: ['personal', 'team', 'groupChat'],
                    commands: commands.map(command => ({
                      title: truncate(command.name.replace(/^\//, ''), 128),
                      description: truncate(command.description ?? command.usage ?? '', 4000)
                    }))
                  }
                ]
              }
            : {})
        }
      ],
      webApplicationInfo: {
        id: APP_ID_PLACEHOLDER,
        resource: 'https://RscBasedStoreApp'
      },
      authorization: {
        permissions: {
          resourceSpecific: [
            { name: 'ChannelMessage.Read.Group', type: 'Application' },
            { name: 'ChatMessage.Read.Chat', type: 'Application' }
          ]
        }
      }
    };

    let setupMarkdown = `# ${appName} Microsoft Teams setup

1. In the Azure portal, create an **Azure Bot** resource for ${botName}. Choose **Multi Tenant** or **Single Tenant** and let Azure create a Microsoft App ID, or use an existing app registration.
2. In **Settings → Configuration**, copy the **Microsoft App ID**. Open **Manage Password** and create a client secret.
3. Set the **Messaging endpoint** to ${webhookUrl ? `\`${webhookUrl}\`` : 'the receive URL from event delivery setup'}. Finish the event delivery setup (enter the Microsoft App ID) before saving the endpoint so the first requests are accepted.
4. In **Channels**, add **Microsoft Teams**.
5. Replace \`${APP_ID_PLACEHOLDER}\` in the manifest below with the Microsoft App ID (in both \`bots[0].botId\` and \`webApplicationInfo.id\`), fill in the developer details, and add 192×192 \`color.png\` and 32×32 \`outline.png\` icons. Zip the three files and upload the package in Teams (**Apps → Manage your apps → Upload an app**) or the Teams admin center.
6. Install the app in the personal chats, group chats, and teams the bot should serve.
7. Connect the bot with the **Teams Bot (Azure Bot)** connection: Microsoft App ID, client secret, and the directory (tenant) ID for single-tenant bots or for opening direct messages.`;

    return {
      output: {
        title: `${appName} Microsoft Teams setup`,
        setupMarkdown,
        manifest: {
          type: 'Microsoft Teams App Manifest',
          value: JSON.stringify(manifest, null, 2),
          format: 'json' as const,
          filename: 'manifest.json'
        },
        links: [
          {
            label: 'Create an Azure Bot resource',
            url: 'https://learn.microsoft.com/en-us/azure/bot-service/bot-service-quickstart-registration'
          },
          {
            label: 'Teams app manifest reference',
            url: 'https://learn.microsoft.com/en-us/microsoft-365/extensibility/schema/root-bots'
          },
          {
            label: 'Receive all channel and chat messages',
            url: 'https://learn.microsoft.com/en-us/microsoftteams/platform/agents-in-teams/enable-receive-all-chat-messages'
          }
        ],
        warnings: [
          ...warnings,
          'The manifest requests resource-specific consent to receive every channel and group chat message. Team and chat owners must consent at install time; without it, the bot receives only messages that @mention it.',
          'Teams sends reaction events only for reactions to messages the bot sent.',
          'Bots cannot post in private channels, cannot send ephemeral messages, and cannot upload files to channels or chats.',
          'Commands are configured in the manifest and arrive as ordinary messages; Teams has no API to list them.',
          'Only the public Microsoft cloud (and GCC service URLs) is supported by this connection.'
        ]
      },
      message: 'Generated Microsoft Teams bot setup instructions.'
    };
  })
  .build();
