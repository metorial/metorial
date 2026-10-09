import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

let PLACEHOLDER_ENDPOINT = 'https://YOUR_HOST/google-chat/events';

/**
 * Public setup instructions for a Google Chat app configured in the Google
 * Chat API Configuration page. Google has no importable app manifest, so the
 * steps describe the console fields directly.
 * https://developers.google.com/workspace/chat/configure-chat-api
 */
export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName?.trim() || 'Your Chat app';
    let description = ctx.input.description?.trim() || 'A Google Chat app';
    let endpoint = ctx.input.webhookUrl?.trim() || PLACEHOLDER_ENDPOINT;
    let warnings: string[] = [];

    if (!ctx.input.webhookUrl) {
      warnings.push(
        `No event endpoint URL was supplied; replace ${PLACEHOLDER_ENDPOINT} with the endpoint shown when you set up inbound events.`
      );
    }

    let usedIds = new Set(
      (ctx.input.commands ?? [])
        .map(command => Number(command.commandId))
        .filter(id => Number.isInteger(id) && id >= 1 && id <= 1000)
    );
    let nextId = 1;
    let commandLines = (ctx.input.commands ?? []).map(command => {
      let id = Number(command.commandId);
      if (!Number.isInteger(id) || id < 1 || id > 1000) {
        while (usedIds.has(nextId)) nextId += 1;
        id = nextId;
        usedIds.add(id);
        warnings.push(
          `Command /${command.name.replace(/^\//, '')} had no numeric command ID; use ${id}.`
        );
      }
      let name = command.name.replace(/^\//, '');
      return `   - **Slash command** \`/${name}\` with Command ID **${id}**${
        command.description ? ` and description "${command.description}"` : ''
      }`;
    });

    if (ctx.input.redirectUris?.length) {
      warnings.push(
        'Google Chat apps that authenticate as the app do not use OAuth redirect URIs; the supplied redirect URIs are not needed for this setup.'
      );
    }

    let setupMarkdown = [
      `# ${appName} Google Chat setup`,
      '',
      '1. In the Google Cloud console, create or choose a project and enable the **Google Chat API**.',
      '2. Open **IAM & Admin > Service accounts**, create a service account for the app, and create a **JSON key**. No IAM role is required for the Chat app.',
      '3. Open **APIs & Services > Google Chat API > Configuration** and fill in:',
      `   - **App name**: ${appName}`,
      '   - **Avatar URL**: an HTTPS image URL for the app',
      `   - **Description**: ${description}`,
      '   - Enable **Interactive features**, and select **Join spaces and group conversations** to use the app outside direct messages.',
      `   - **Connection settings**: choose **HTTP endpoint URL** and enter \`${endpoint}\``,
      '   - Classic Chat apps and **Google Workspace add-on** Chat apps both work; converting an existing app to an add-on cannot be undone. For an add-on, select **Use common HTTP endpoint URL for all triggers** with the URL above and note the add-on service account email shown on this page.',
      '   - **Authentication Audience**: choose **Project Number** (recommended: requests are bound to your project) or **HTTP endpoint URL** (keep the endpoint URL private).',
      ...(commandLines.length
        ? ['   - **Commands**: add the following commands:', ...commandLines]
        : []),
      '   - **Visibility**: choose the people or groups in your domain who can install the app, then click **Save**.',
      '4. Note the numeric **Project number** and the **Project ID** from the Google Cloud console **Dashboard**. The service account must belong to this project.',
      '5. Connect Google Chat with the **Google Chat App Service Account** method using the JSON key and the project number.',
      '6. Set up inbound events with the same endpoint URL, Authentication Audience, project number, and project ID (and the add-on service account email for an add-on app). Finish that setup before people message the app, because requests are rejected until it is saved.',
      '7. Add the app to a space or send it a direct message. The app receives direct messages, messages that @mention it, and commands; replies are sent through the Chat API.'
    ].join('\n');

    warnings.push(
      'With app authentication, Google Chat apps cannot add reactions, upload files, or list message history; these actions are not available.',
      'A Chat app can only edit or delete its own messages, and can only open a direct message that already exists with the user.'
    );

    return {
      output: {
        title: `${appName} Google Chat setup`,
        setupMarkdown,
        links: [
          {
            label: 'Google Chat API configuration',
            url: 'https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat'
          },
          {
            label: 'Configure the Google Chat API',
            url: 'https://developers.google.com/workspace/chat/configure-chat-api'
          },
          {
            label: 'Authenticate as a Google Chat app',
            url: 'https://developers.google.com/workspace/chat/authenticate-authorize-chat-app'
          },
          {
            label: 'Verify requests from Google Chat',
            url: 'https://developers.google.com/workspace/chat/verify-requests-from-chat'
          }
        ],
        warnings
      },
      message: 'Generated Google Chat app setup instructions.'
    };
  })
  .build();
