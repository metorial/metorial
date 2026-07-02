import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let campaignActivityTrigger = SlateTrigger.create(spec, {
  name: 'Campaign Sent',
  key: 'campaign_sent',
  description:
    '[Polling fallback] Triggers when a campaign is sent. Polls for newly sent campaigns and returns campaign details including recipients, subject, and status.'
})
  .input(
    z.object({
      campaignId: z.string(),
      title: z.string(),
      subjectLine: z.string(),
      status: z.string(),
      sendTime: z.string(),
      listId: z.string(),
      listName: z.string(),
      emailsSent: z.number(),
      type: z.string()
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      title: z.string(),
      subjectLine: z.string(),
      status: z.string(),
      sendTime: z.string(),
      listId: z.string(),
      listName: z.string(),
      emailsSent: z.number(),
      campaignType: z.string()
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new MailchimpClient({
        token: ctx.auth.token,
        serverPrefix: ctx.auth.serverPrefix
      });

      let lastPollTime = (ctx.state as any)?.lastPollTime as string | undefined;

      let params: any = {
        count: 50,
        status: 'sent'
      };

      if (lastPollTime) {
        params.sinceSendTime = lastPollTime;
      }

      let result = await client.getCampaigns(params);
      let campaigns = result.campaigns ?? [];

      let inputs = campaigns.map((c: any) => ({
        campaignId: c.id,
        title: c.settings?.title ?? '',
        subjectLine: c.settings?.subject_line ?? '',
        status: c.status,
        sendTime: c.send_time ?? '',
        listId: c.recipients?.list_id ?? '',
        listName: c.recipients?.list_name ?? '',
        emailsSent: c.emails_sent ?? 0,
        type: c.type ?? 'regular'
      }));

      let newLastPollTime = new Date().toISOString();

      return {
        inputs,
        updatedState: {
          lastPollTime: newLastPollTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'campaign.sent',
        id: `campaign_sent_${ctx.input.campaignId}_${ctx.input.sendTime}`,
        output: {
          campaignId: ctx.input.campaignId,
          title: ctx.input.title,
          subjectLine: ctx.input.subjectLine,
          status: ctx.input.status,
          sendTime: ctx.input.sendTime,
          listId: ctx.input.listId,
          listName: ctx.input.listName,
          emailsSent: ctx.input.emailsSent,
          campaignType: ctx.input.type
        }
      };
    }
  })
  .build();
