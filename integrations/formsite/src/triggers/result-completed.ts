import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FormsiteClient } from '../lib/client';
import { spec } from '../spec';

export let resultCompleted = SlateTrigger.create(spec, {
  name: 'Result Completed',
  key: 'result_completed',
  description:
    'Triggers when a form submission is completed. Receives the full result data including all submitted field values and metadata.'
})
  .input(
    z.object({
      resultId: z.string().describe('Unique result/submission identifier'),
      formDir: z.string().describe('Form directory identifier for the webhook'),
      handshakeKey: z
        .string()
        .optional()
        .describe('Handshake key from the webhook payload for verification'),
      dateStart: z.string().optional().describe('When the user started filling out the form'),
      dateFinish: z.string().optional().describe('When the user submitted the form'),
      dateUpdate: z.string().optional().describe('When the result was last updated'),
      userIp: z.string().optional().describe('IP address of the submitter'),
      userBrowser: z.string().optional().describe('Browser used by the submitter'),
      userDevice: z.string().optional().describe('Device type used by the submitter'),
      userReferrer: z.string().optional().describe('Referrer URL'),
      resultStatus: z.string().optional().describe('Result status'),
      loginUsername: z.string().optional().describe('Save & Return username if applicable'),
      loginEmail: z.string().optional().describe('Save & Return email if applicable'),
      paymentStatus: z.string().optional().describe('Payment status if applicable'),
      paymentAmount: z.string().optional().describe('Payment amount if applicable'),
      items: z
        .array(
          z.object({
            itemId: z.string().describe('Item/field ID'),
            value: z.string().describe('Submitted value')
          })
        )
        .optional()
        .describe('Submitted field values')
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('Unique result/submission identifier'),
      formDir: z.string().describe('Form directory identifier'),
      dateStart: z.string().optional().describe('When the user started filling out the form'),
      dateFinish: z.string().optional().describe('When the user submitted the form'),
      dateUpdate: z.string().optional().describe('When the result was last updated'),
      userIp: z.string().optional().describe('IP address of the submitter'),
      userBrowser: z.string().optional().describe('Browser used by the submitter'),
      userDevice: z.string().optional().describe('Device type used by the submitter'),
      userReferrer: z.string().optional().describe('Referrer URL'),
      resultStatus: z.string().optional().describe('Result status'),
      loginUsername: z.string().optional().describe('Save & Return username if applicable'),
      loginEmail: z.string().optional().describe('Save & Return email if applicable'),
      paymentStatus: z.string().optional().describe('Payment status if applicable'),
      paymentAmount: z.string().optional().describe('Payment amount if applicable'),
      items: z
        .array(
          z.object({
            itemId: z.string().describe('Item/field ID matching the form item definitions'),
            value: z.string().describe('Submitted value for this item')
          })
        )
        .optional()
        .describe('Submitted field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FormsiteClient({
        token: ctx.auth.token,
        server: ctx.config.server,
        userDir: ctx.config.userDir
      });

      // We need a formDir to register webhooks. Store it from the config or use a convention.
      // Since Formsite webhooks are per-form, we use the webhookBaseUrl to register.
      // The formDir is required - we'll extract it from any available configuration.
      // Users will need to have formDir set. We'll store a handshake key for verification.
      let handshakeKey = crypto.randomUUID();

      // List all forms to register webhooks - but we need a specific form.
      // The user must configure which form to watch. We'll try all forms.
      let forms = await client.listForms();

      let registeredForms: Array<{ formDir: string; url: string }> = [];

      for (let form of forms) {
        try {
          await client.createOrUpdateWebhook(form.formDir, {
            url: ctx.input.webhookBaseUrl,
            handshakeKey
          });
          registeredForms.push({ formDir: form.formDir, url: ctx.input.webhookBaseUrl });
        } catch {
          // Some forms may not support webhooks, skip those
        }
      }

      return {
        registrationDetails: {
          handshakeKey,
          registeredForms
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FormsiteClient({
        token: ctx.auth.token,
        server: ctx.config.server,
        userDir: ctx.config.userDir
      });

      let registeredForms = ctx.input.registrationDetails?.registeredForms as
        | Array<{ formDir: string; url: string }>
        | undefined;

      if (registeredForms && Array.isArray(registeredForms)) {
        for (let entry of registeredForms) {
          try {
            await client.deleteWebhook(entry.formDir, entry.url);
          } catch {
            // Best-effort cleanup
          }
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      // Formsite webhook payload uses the same format as Get Results
      // The result data may be nested under a "result" key or be at the top level
      let result = data.result || data;

      let resultId = result.id ? String(result.id) : '';
      let formDir = result.form_directory || data.form_directory || '';

      let items: Array<{ itemId: string; value: string }> = [];
      if (result.items && Array.isArray(result.items)) {
        items = result.items.map((item: any) => ({
          itemId: item.id || '',
          value: item.value || ''
        }));
      }

      return {
        inputs: [
          {
            resultId,
            formDir,
            handshakeKey: data.handshake_key || result.handshake_key,
            dateStart: result.date_start,
            dateFinish: result.date_finish,
            dateUpdate: result.date_update,
            userIp: result.user?.ip,
            userBrowser: result.user?.browser,
            userDevice: result.user?.device,
            userReferrer: result.user?.referrer,
            resultStatus: result.result_status,
            loginUsername: result.login?.username,
            loginEmail: result.login?.email,
            paymentStatus: result.payment?.status,
            paymentAmount: result.payment?.amount,
            items
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'result.completed',
        id: `result-completed-${ctx.input.resultId || crypto.randomUUID()}`,
        output: {
          resultId: ctx.input.resultId,
          formDir: ctx.input.formDir,
          dateStart: ctx.input.dateStart,
          dateFinish: ctx.input.dateFinish,
          dateUpdate: ctx.input.dateUpdate,
          userIp: ctx.input.userIp,
          userBrowser: ctx.input.userBrowser,
          userDevice: ctx.input.userDevice,
          userReferrer: ctx.input.userReferrer,
          resultStatus: ctx.input.resultStatus,
          loginUsername: ctx.input.loginUsername,
          loginEmail: ctx.input.loginEmail,
          paymentStatus: ctx.input.paymentStatus,
          paymentAmount: ctx.input.paymentAmount,
          items: ctx.input.items
        }
      };
    }
  })
  .build();
