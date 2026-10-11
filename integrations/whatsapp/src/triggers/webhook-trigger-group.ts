import { triggerGroup } from 'slates';
import { buildWhatsAppConnectionRoutingMatchers } from '../lib/routingMatcher';
import { spec } from '../spec';
import { whatsappMessageEventSchema } from './event-schemas';
import { processWhatsAppWebhook, whatsappWebhookRegistrationSchema } from './webhook';

export let whatsappWebhookTriggerGroup = triggerGroup(spec, {
  key: 'webhook',
  name: 'WhatsApp Webhook',
  description:
    'Receives WhatsApp Cloud API messages webhooks from your Meta app and routes each customer message to the connection for the receiving business phone number.',
  eventSchema: whatsappMessageEventSchema
})
  .webhook({
    manualRegistration: {
      userConfigSchema: whatsappWebhookRegistrationSchema,
      fullConfigSchema: whatsappWebhookRegistrationSchema,

      setup: async ctx => ({
        webhookSetupDocument: [
          'Complete this setup **before** saving the callback URL in Meta. Meta verifies the URL immediately, and verification fails until the App Secret and Verify Token below are saved.',
          '',
          '1. Choose a Verify Token (any random string) and copy your Meta app’s **App Secret** from **App Dashboard > App settings > Basic**. Enter both below and save.',
          '2. In the [Meta App Dashboard](https://developers.facebook.com/apps), open **Use cases > Connect with customers through WhatsApp > Customize > Step 2. Production setup > Configure Webhooks**.',
          '3. Set the **Callback URL** to:',
          '',
          `\`\`\`\n${ctx.input.webhookUrl}\n\`\`\``,
          '',
          '4. Set the **Verify token** to the same value you entered below, then click **Verify and save**.',
          '5. In the **Webhook fields** list that appears after saving, switch **messages** to **Subscribed**.',
          '6. Subscribe the app to your WhatsApp Business Account: `POST https://graph.facebook.com/<API_VERSION>/<WABA_ID>/subscribed_apps` with an access token for that account. Check with `GET` on the same path; dashboard setup can leave only Meta’s own test app subscribed.',
          '7. Publish the app (it needs a privacy policy URL under **App settings > Basic**). Unpublished apps receive only test webhooks sent from the dashboard, not real messages.',
          '',
          'Inbound messages, reactions, and media are delivered for every business phone number in the subscribed account; each event reaches the connection configured with the receiving phone number ID.'
        ].join('\n'),
        partialWebhookRegistrationPayload: {}
      }),

      finish: async ctx => ({
        webhookRegistrationPayload: whatsappWebhookRegistrationSchema.parse({
          ...ctx.input.partialWebhookRegistrationPayload,
          ...ctx.input.userWebhookRegistrationPayload
        })
      })
    },
    process: processWhatsAppWebhook
  })
  .routingMatchers(async ctx => buildWhatsAppConnectionRoutingMatchers(ctx.config))
  .build();
