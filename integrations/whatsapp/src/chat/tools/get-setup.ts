import { getSetup as contract } from '@slates/adapter-chat';
import { spec } from '../../spec';

export let chatGetSetup = contract
  .implement(spec)
  .handleInvocation(async ctx => {
    let appName = ctx.input.appName ?? 'your Meta app';
    let webhookUrl = ctx.input.webhookUrl;
    let warnings = [
      'Free-form messages can only be sent within 24 hours of the customer’s last message (the customer service window). Outside the window WhatsApp requires an approved template message.',
      'WhatsApp business messages cannot be edited or deleted through the Cloud API, and conversations have no threads; replies quote the original message instead.',
      'Delivery failures (including a closed customer service window) can be reported after a send succeeds, through message status webhooks.',
      'Slash commands, typing indicators without an inbound message, and ephemeral messages are not available on WhatsApp.'
    ];
    if (!webhookUrl) {
      warnings.unshift(
        'No webhook URL was provided. Replace <WEBHOOK_URL> below with the callback URL issued for this connection.'
      );
    }
    if (ctx.input.commands?.length) {
      warnings.push('WhatsApp has no slash commands; the supplied commands were not used.');
    }

    let setupMarkdown = `# WhatsApp Cloud API setup

1. In the [Meta App Dashboard](https://developers.facebook.com/apps), create or open ${ctx.input.appName ? `**${appName}**` : 'a Business app'} and add the **WhatsApp** product (use case **Connect with customers through WhatsApp**).
2. Open **Use cases > Connect with customers through WhatsApp > Customize**. Under **Step 2. Production setup**, add and register your business phone number (for a quick test, **Step 1. Try it out** provides a test number). Copy the **Phone Number ID** and **WhatsApp Business Account ID** into the connection configuration.
3. In **Meta Business Suite > Business settings > System users**, create a system user, assign it the app and the WhatsApp Business Account, and generate a permanent access token with the \`whatsapp_business_messaging\` and \`whatsapp_business_management\` permissions. Use that token for the connection.
4. Create the webhook registration for this connection and enter your Meta app's **App Secret** (**App settings > Basic**) and a **Verify token** of your choosing. Save it **before** configuring Meta, because Meta verifies the callback URL immediately.
5. In the same use case, open **Step 2. Production setup > Configure Webhooks** and set the **Callback URL** to:

\`\`\`
${webhookUrl ?? '<WEBHOOK_URL>'}
\`\`\`

   and the **Verify token** to the same value, then click **Verify and save**.
6. In the **Webhook fields** list that appears after saving, switch **messages** to **Subscribed**.
7. Subscribe the app to the WhatsApp Business Account with \`POST /<WABA_ID>/subscribed_apps\` and the access token. Check with \`GET /<WABA_ID>/subscribed_apps\`: dashboard setup can leave only Meta's own test app subscribed.
8. Publish the app (**Publish**; it needs a privacy policy URL under **App settings > Basic**). Unpublished apps receive only test webhooks sent from the dashboard, not real messages, even from app admins.

A Meta test number replies only to phone numbers added to its recipient list in **Step 1. Try it out**.

Each customer conversation appears as a direct-message channel identified by the customer's WhatsApp ID. Messages, media, locations, contacts, button replies, and reactions sent by customers are delivered as chat events.`;

    return {
      output: {
        title: 'WhatsApp Cloud API setup',
        setupMarkdown,
        links: [
          { label: 'Meta App Dashboard', url: 'https://developers.facebook.com/apps' },
          {
            label: 'Create a webhook endpoint',
            url: 'https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/create-webhook-endpoint'
          },
          {
            label: 'System user access tokens',
            url: 'https://developers.facebook.com/documentation/business-messaging/whatsapp/access-tokens'
          },
          {
            label: 'Subscribe an app to a WhatsApp Business Account',
            url: 'https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/manage-webhooks'
          }
        ],
        warnings
      },
      message: 'Generated WhatsApp setup instructions.'
    };
  })
  .build();
