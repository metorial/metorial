import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

let engagementTypeMap: Record<string, string> = {
  banner: 'banners',
  chat_message: 'chat-messages',
  email: 'emails',
  survey: 'surveys',
  product_tour: 'product-tours',
  tooltip: 'tooltips',
  checklist: 'checklists',
  news: 'news',
  modal: 'modals',
  whatsapp: 'whatsapp-messages',
  cobrowse: 'cobrowse',
  push_notification: 'push-notifications'
};

export let listEngagements = SlateTool.create(spec, {
  name: 'List Engagements',
  key: 'list_engagements',
  description: `List engagement campaigns of a specific type. Retrieve all banners, chat messages, emails, surveys, product tours, tooltips, checklists, news, modals, WhatsApp messages, cobrowse sessions, or push notifications.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      engagementType: z
        .enum([
          'banner',
          'chat_message',
          'email',
          'survey',
          'product_tour',
          'tooltip',
          'checklist',
          'news',
          'modal',
          'whatsapp',
          'cobrowse',
          'push_notification'
        ])
        .describe('Type of engagement to list')
    })
  )
  .output(
    z.object({
      engagements: z
        .array(z.record(z.string(), z.any()))
        .describe('List of engagement objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let apiPath = engagementTypeMap[ctx.input.engagementType];
    if (!apiPath) {
      throw new Error(`Unknown engagement type: ${ctx.input.engagementType}`);
    }

    let result = await client.listEngagements(apiPath);
    let engagements = Array.isArray(result) ? result : [];

    return {
      output: { engagements },
      message: `Retrieved **${engagements.length}** ${ctx.input.engagementType} engagements.`
    };
  })
  .build();
