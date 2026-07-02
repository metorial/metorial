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

export let manageEngagement = SlateTool.create(spec, {
  name: 'Manage Engagement',
  key: 'manage_engagement',
  description: `Create, update, or delete engagement campaigns in Gleap. Supports banners, chat messages, emails, surveys, product tours, tooltips, checklists, news, modals, WhatsApp messages, cobrowse sessions, and push notifications.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
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
        .describe('Type of engagement'),
      engagementId: z
        .string()
        .optional()
        .describe('Engagement ID (required for update and delete)'),
      engagementData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Engagement configuration data (required for create and update)')
    })
  )
  .output(
    z.object({
      engagement: z
        .record(z.string(), z.any())
        .optional()
        .describe('The engagement object (for create/update)'),
      deleted: z.boolean().optional().describe('Whether the engagement was deleted')
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

    if (ctx.input.action === 'create') {
      if (!ctx.input.engagementData) {
        throw new Error('engagementData is required when creating an engagement');
      }
      let engagement = await client.createEngagement(apiPath, ctx.input.engagementData);
      return {
        output: { engagement },
        message: `Created **${ctx.input.engagementType}** engagement.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.engagementId) {
        throw new Error('engagementId is required when updating an engagement');
      }
      let engagement = await client.updateEngagement(
        apiPath,
        ctx.input.engagementId,
        ctx.input.engagementData || {}
      );
      return {
        output: { engagement },
        message: `Updated **${ctx.input.engagementType}** engagement **${ctx.input.engagementId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.engagementId) {
        throw new Error('engagementId is required when deleting an engagement');
      }
      await client.deleteEngagement(apiPath, ctx.input.engagementId);
      return {
        output: { deleted: true },
        message: `Deleted **${ctx.input.engagementType}** engagement **${ctx.input.engagementId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
