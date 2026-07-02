import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newEmail = SlateTrigger.create(spec, {
  name: 'New Email',
  key: 'new_email',
  description:
    'Triggers when a new email is received in a Zoho Mail account. Polls for new messages in a specified folder or across all folders.'
})
  .input(
    z.object({
      messageId: z.string().describe('Message ID'),
      subject: z.string().optional().describe('Email subject'),
      sender: z.string().optional().describe('Sender display name'),
      fromAddress: z.string().optional().describe('Sender email address'),
      toAddress: z.string().optional().describe('Recipient email address'),
      summary: z.string().optional().describe('Email preview text'),
      folderId: z.string().optional().describe('Folder ID'),
      receivedTime: z.string().optional().describe('Received timestamp'),
      hasAttachment: z.boolean().optional().describe('Has attachments'),
      threadId: z.string().optional().describe('Thread ID'),
      flagid: z.string().optional().describe('Flag ID')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      subject: z.string().optional().describe('Email subject'),
      sender: z.string().optional().describe('Sender display name'),
      fromAddress: z.string().optional().describe('Sender email address'),
      toAddress: z.string().optional().describe('Recipient email address'),
      summary: z.string().optional().describe('Email preview text'),
      folderId: z.string().optional().describe('Folder ID'),
      receivedTime: z.string().optional().describe('Received timestamp'),
      hasAttachment: z.boolean().optional().describe('Has attachments'),
      threadId: z.string().optional().describe('Thread ID')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        domain: ctx.auth.dataCenterDomain
      });

      let state = ctx.input.state || {};

      let accountId = ctx.auth.accountId;
      if (!accountId) {
        let accounts = await client.getAccounts();
        if (accounts.length === 0) return { inputs: [], updatedState: state };
        accountId = String(accounts[0].accountId);
      }

      let lastReceivedTime = state.lastReceivedTime as string | undefined;

      let messages = await client.searchMessages(accountId, {
        searchKey: 'newMails',
        limit: 50,
        includeto: true
      });

      if (!messages || messages.length === 0) {
        return { inputs: [], updatedState: state };
      }

      let filteredMessages = messages;
      if (lastReceivedTime) {
        let lastTime = Number(lastReceivedTime);
        filteredMessages = messages.filter((m: any) => {
          let receivedTime = Number(m.receivedTime || m.sentDateInGMT || 0);
          return receivedTime > lastTime;
        });
      }

      let newestTime = lastReceivedTime;
      for (let m of messages) {
        let t = String(m.receivedTime || m.sentDateInGMT || '0');
        if (!newestTime || Number(t) > Number(newestTime)) {
          newestTime = t;
        }
      }

      let inputs = filteredMessages.map((m: any) => ({
        messageId: String(m.messageId),
        subject: m.subject,
        sender: m.sender,
        fromAddress: m.fromAddress,
        toAddress: m.toAddress,
        summary: m.summary,
        folderId: m.folderId ? String(m.folderId) : undefined,
        receivedTime: m.receivedTime ? String(m.receivedTime) : undefined,
        hasAttachment: m.hasAttachment === '1' || m.hasAttachment === true,
        threadId: m.threadId ? String(m.threadId) : undefined,
        flagid: m.flagid ? String(m.flagid) : undefined
      }));

      return {
        inputs,
        updatedState: {
          ...state,
          lastReceivedTime: newestTime
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'email.received',
        id: ctx.input.messageId,
        output: {
          messageId: ctx.input.messageId,
          subject: ctx.input.subject,
          sender: ctx.input.sender,
          fromAddress: ctx.input.fromAddress,
          toAddress: ctx.input.toAddress,
          summary: ctx.input.summary,
          folderId: ctx.input.folderId,
          receivedTime: ctx.input.receivedTime,
          hasAttachment: ctx.input.hasAttachment,
          threadId: ctx.input.threadId
        }
      };
    }
  })
  .build();
