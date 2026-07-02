import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let smsReport = SlateTrigger.create(spec, {
  name: 'New SMS Report',
  key: 'sms_report',
  description:
    'Polls for newly sent SMS campaign logs. Triggers when new SMS messages are found in the account report since the last check.'
})
  .input(
    z.object({
      messageId: z.string().describe('Unique message ID from the SMS report.'),
      mobileNumber: z.string().describe('Recipient mobile number.'),
      status: z.string().describe('Delivery status of the message.'),
      senderId: z.string().describe('Sender ID used for the message.'),
      text: z.string().describe('Message content.'),
      sentAt: z.string().describe('Timestamp when the message was sent.'),
      rawEntry: z.any().describe('Raw report entry from the API.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message ID.'),
      mobileNumber: z.string().describe('Recipient mobile number.'),
      status: z.string().describe('Delivery status (e.g., DELIVRD, AWAITED-DLR, FAILED).'),
      senderId: z.string().describe('Sender ID used.'),
      text: z.string().describe('Message content sent.'),
      sentAt: z.string().describe('Timestamp of when the message was sent.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new SmsAlertClient({ token: ctx.auth.token });

      let lastPollDate = ctx.state?.lastPollDate as string | undefined;

      let params: { fromDate?: string; toDate?: string } = {};
      if (lastPollDate) {
        params.fromDate = lastPollDate;
      }

      let now = new Date();
      let todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      params.toDate = todayStr;

      let result = await client.getSmsReport({
        fromDate: params.fromDate,
        toDate: params.toDate
      });

      let entries: any[] = [];
      if (result.description && Array.isArray(result.description)) {
        entries = result.description;
      } else if (result.description && typeof result.description === 'object') {
        entries = Object.values(result.description);
      }

      let seenIds = (ctx.state?.seenIds as string[] | undefined) || [];

      let newEntries = entries.filter((entry: any) => {
        let entryId = entry.id || entry.msgid || entry.message_id || JSON.stringify(entry);
        return !seenIds.includes(entryId);
      });

      let newSeenIds = [
        ...seenIds,
        ...newEntries.map(
          (entry: any) => entry.id || entry.msgid || entry.message_id || JSON.stringify(entry)
        )
      ].slice(-1000); // Keep only last 1000 IDs

      return {
        inputs: newEntries.map((entry: any) => ({
          messageId: String(entry.id || entry.msgid || entry.message_id || ''),
          mobileNumber: String(entry.mobileno || entry.mobile || entry.number || ''),
          status: String(entry.status || entry.delivery_status || 'unknown'),
          senderId: String(entry.sender || entry.senderid || ''),
          text: String(entry.text || entry.message || entry.msg || ''),
          sentAt: String(entry.date || entry.created || entry.sent_at || ''),
          rawEntry: entry
        })),
        updatedState: {
          lastPollDate: todayStr,
          seenIds: newSeenIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'sms.sent',
        id: ctx.input.messageId || `sms-${Date.now()}`,
        output: {
          messageId: ctx.input.messageId,
          mobileNumber: ctx.input.mobileNumber,
          status: ctx.input.status,
          senderId: ctx.input.senderId,
          text: ctx.input.text,
          sentAt: ctx.input.sentAt
        }
      };
    }
  })
  .build();
