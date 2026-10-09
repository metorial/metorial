import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

let normalizeCommand = (name: string) => name.trim().replace(/^\/+/, '');

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName?.trim() || 'YOUR_APP_NAME';
    let webhookUrl = ctx.input.webhookUrl?.trim() || 'https://YOUR_HOST/zoom/chatbot';
    let redirectUri =
      ctx.input.redirectUris?.[0]?.trim() || 'https://YOUR_HOST/oauth/callback';
    let commands = (ctx.input.commands ?? []).map(command => normalizeCommand(command.name));
    let slashCommand = commands[0] ? `/${commands[0]}` : '/YOUR_COMMAND';

    let warnings: string[] = [];
    if (!ctx.input.webhookUrl) {
      warnings.push('No endpoint URL was supplied; replace the Bot Endpoint URL placeholder.');
    }
    if (!ctx.input.redirectUris?.length) {
      warnings.push(
        'No redirect URI was supplied; Zoom requires an OAuth redirect URL on every General app, so replace the placeholder.'
      );
    }
    if (commands.length === 0) {
      warnings.push('No slash command was supplied; replace the /YOUR_COMMAND placeholder.');
    }
    if (commands.length > 1) {
      warnings.push(
        `A Zoom chatbot has one slash command; only ${slashCommand} is used. Pass extra actions as text after the command instead.`
      );
    }
    warnings.push(
      'Inbound events cover chatbot requests (the slash command and messages sent to the chatbot). @mentions, ordinary channel messages, reactions, edits, and deletions are not received.',
      'The Zoom chatbot API has no file upload, reaction, or typing indicator endpoints.'
    );

    let setupMarkdown = `# ${appName}: Zoom Team Chat chatbot setup

1. Sign in to the [Zoom App Marketplace](https://marketplace.zoom.us/) and choose **Develop > Build App > General App**.
2. On **Basic Info**, name the app **${appName}** and choose **Admin-managed** (recommended, so the chatbot is installed for the whole account). For a user-managed app you will also need the JID of the authorizing user.
3. Set the **OAuth redirect URL** and the OAuth allow list to:

   \`\`\`
   ${redirectUri}
   \`\`\`

4. On **Features > Surface**, select **Zoom Chat** and enable **Zoom Chat Subscription**:
   - **Slash command**: \`${slashCommand}\`
   - **Bot Endpoint URL**:

     \`\`\`
     ${webhookUrl}
     \`\`\`

   Finish the endpoint setup (Secret Token, Bot JID, and slash command) before saving here, because Zoom validates the endpoint when you save.
5. Optionally enable **Add this app to Chat channels** so members can use the chatbot in channels.
6. On **Scopes**, confirm the chatbot scope \`imchat:bot\` was added automatically.
7. On **Local Test**, click **Add App Now** and allow it to install the chatbot in your account.
8. Connect the chatbot with the **Team Chat Chatbot** method using:
   - **Client ID** and **Client Secret** from Basic Info > App Credentials
   - **Bot JID** from Features > Surface > Zoom Chat Subscription
   - **Account ID** of the Zoom account where the chatbot is installed
   - For user-managed apps only, the authorizing user's JID (\`USER_ID@xmpp.zoom.us\`)

Messages are sent to a user JID (\`USER_ID@xmpp.zoom.us\`) for a direct chat or to a channel JID (\`CHANNEL_ID@conference.xmpp.zoom.us\`).`;

    return {
      output: {
        title: `${appName} Zoom chatbot setup`,
        setupMarkdown,
        links: [
          {
            label: 'Create a chatbot for Zoom Chat',
            url: 'https://developers.zoom.us/docs/chat/create-chatbot/'
          },
          {
            label: 'Chatbot authorization',
            url: 'https://developers.zoom.us/docs/chat/installation-and-authentication/'
          },
          {
            label: 'Send, edit, and delete chatbot messages',
            url: 'https://developers.zoom.us/docs/chat/send-edit-and-delete-messages/'
          },
          { label: 'Zoom App Marketplace', url: 'https://marketplace.zoom.us/' }
        ],
        warnings
      },
      message: 'Generated Zoom Team Chat chatbot setup instructions.'
    };
  })
  .build();
