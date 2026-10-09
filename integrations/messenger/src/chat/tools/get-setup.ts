import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

let WEBHOOK_FIELDS = ['messages', 'message_reactions', 'message_edits'];
let OAUTH_PERMISSIONS = [
  'pages_messaging',
  'pages_manage_metadata',
  'pages_show_list',
  'pages_read_engagement'
];

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName ?? 'Messenger chat app';
    let webhookUrl = ctx.input.webhookUrl;
    let redirectUris = ctx.input.redirectUris ?? [];
    let warnings: string[] = [
      'Pages can send standard messages only within 24 hours of the person’s last message. Later sends fail until the person writes again.',
      'While the Meta app is in development mode, only people with a role on the app can message the Page. Live use needs App Review for pages_messaging and Business Asset User Profile Access.',
      'Each file is delivered as its own Messenger message. Messenger cannot edit or delete messages the Page sent.',
      'Read receipts mark the whole conversation as seen, and removing a reaction removes the Page’s only reaction on that message.'
    ];

    if (!webhookUrl) {
      warnings.push(
        'No webhook URL was supplied. Replace YOUR_WEBHOOK_URL with the callback URL from the webhook setup.'
      );
    }
    if (redirectUris.length === 0) {
      warnings.push(
        'No OAuth redirect URI was supplied. Add the connection’s redirect URI under Facebook Login > Settings > Valid OAuth Redirect URIs.'
      );
    }
    if (ctx.input.commands?.length) {
      warnings.push(
        'Messenger has no slash commands. Use the persistent menu or ice breakers in the Messenger profile for shortcuts instead.'
      );
    }

    let redirectList = redirectUris.length
      ? redirectUris.map(uri => `   - \`${uri}\``).join('\n')
      : '   - `YOUR_OAUTH_REDIRECT_URI`';

    let setupMarkdown = `# ${appName} Messenger setup

1. In the [Meta App Dashboard](https://developers.facebook.com/apps/), create a **Business** app and add the **Messenger** product. Keep the Facebook Page you want to connect ready; you need a role on it that can manage messages.
2. Add **Facebook Login for Business** and register these **Valid OAuth Redirect URIs**:
${redirectList}
3. Connect the Page with the permissions ${OAUTH_PERMISSIONS.map(permission => `\`${permission}\``).join(', ')}. The connection stores the Page access token and Page id.
4. Copy the **App Secret** from **App settings > Basic** and choose a **Verify Token**. Enter both in the webhook setup for this integration and save it *before* configuring Meta, because Meta verifies the callback immediately.
5. Under **Messenger > Messenger API Settings**, set the **Callback URL** to \`${webhookUrl ?? 'YOUR_WEBHOOK_URL'}\`, enter the same Verify Token, and select **Verify and save**.
6. Subscribe to the webhook fields ${WEBHOOK_FIELDS.map(field => `\`${field}\``).join(', ')}.
7. Under **Generate access tokens**, select **Add subscriptions** for the Page and enable the same fields, or call \`POST /{page-id}/subscribed_apps?subscribed_fields=${WEBHOOK_FIELDS.join(',')}\` with the Page access token.
8. Submit the app for App Review before switching it to live mode.`;

    return {
      output: {
        title: `${appName} Messenger setup`,
        setupMarkdown,
        links: [
          { label: 'Meta App Dashboard', url: 'https://developers.facebook.com/apps/' },
          {
            label: 'Messenger Platform webhooks',
            url: 'https://developers.facebook.com/docs/messenger-platform/webhooks'
          },
          {
            label: 'Messenger Platform overview',
            url: 'https://developers.facebook.com/docs/messenger-platform'
          },
          {
            label: 'App Review',
            url: 'https://developers.facebook.com/docs/app-review'
          }
        ],
        warnings
      },
      message: 'Generated Messenger setup instructions.'
    };
  })
  .build();
