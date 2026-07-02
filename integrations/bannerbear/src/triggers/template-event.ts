import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BannerbearClient } from '../lib/client';
import { spec } from '../spec';

export let templateEvent = SlateTrigger.create(spec, {
  name: 'Template Event',
  key: 'template_event',
  description: 'Triggers when a template is created or edited in the Bannerbear project.'
})
  .input(
    z.object({
      eventType: z
        .enum(['template_created', 'template_edited'])
        .describe('Type of template event'),
      templateUid: z.string().describe('UID of the affected template'),
      templateName: z.string().describe('Name of the template'),
      templateWidth: z.number().describe('Width in pixels'),
      templateHeight: z.number().describe('Height in pixels'),
      previewUrl: z.string().nullable().describe('Preview image URL'),
      tags: z.array(z.string()).describe('Template tags')
    })
  )
  .output(
    z.object({
      templateUid: z.string().describe('UID of the template'),
      templateName: z.string().describe('Name of the template'),
      templateWidth: z.number().describe('Width in pixels'),
      templateHeight: z.number().describe('Height in pixels'),
      previewUrl: z.string().nullable().describe('Preview image URL'),
      tags: z.array(z.string()).describe('Template tags')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BannerbearClient({ token: ctx.auth.token });

      let createdWebhook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/template_created`,
        event: 'template_created'
      });

      let editedWebhook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/template_edited`,
        event: 'template_edited'
      });

      return {
        registrationDetails: {
          createdWebhookUid: createdWebhook.uid,
          editedWebhookUid: editedWebhook.uid
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BannerbearClient({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as {
        createdWebhookUid: string;
        editedWebhookUid: string;
      };

      await client.deleteWebhook(details.createdWebhookUid).catch(() => {});
      await client.deleteWebhook(details.editedWebhookUid).catch(() => {});
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathSegments = url.pathname.split('/');
      let lastSegment = pathSegments[pathSegments.length - 1];

      let eventType: 'template_created' | 'template_edited' =
        lastSegment === 'template_edited' ? 'template_edited' : 'template_created';

      return {
        inputs: [
          {
            eventType,
            templateUid: data.uid,
            templateName: data.name || '',
            templateWidth: data.width || 0,
            templateHeight: data.height || 0,
            previewUrl: data.preview_url || null,
            tags: data.tags || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `template.${ctx.input.eventType === 'template_created' ? 'created' : 'edited'}`,
        id: `${ctx.input.eventType}_${ctx.input.templateUid}_${Date.now()}`,
        output: {
          templateUid: ctx.input.templateUid,
          templateName: ctx.input.templateName,
          templateWidth: ctx.input.templateWidth,
          templateHeight: ctx.input.templateHeight,
          previewUrl: ctx.input.previewUrl,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();
