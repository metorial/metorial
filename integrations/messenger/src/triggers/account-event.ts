import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';

export let accountEvent = SlateTrigger.create(spec, {
  name: 'Account & Handover Event',
  key: 'account_handover_event',
  description:
    'Triggered for account linking/unlinking events, policy enforcement actions, and handover protocol events (pass, take, request thread control).'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (account_linking, policy_enforcement, handover_pass, handover_take, handover_request)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      senderId: z.string().describe('PSID of the user or affected entity'),
      recipientId: z.string().describe('Page ID'),
      timestamp: z.string().describe('Event timestamp'),
      accountLinkingStatus: z.string().optional().describe('linked or unlinked'),
      authorizationCode: z
        .string()
        .optional()
        .describe('Authorization code from account linking'),
      policyAction: z.string().optional().describe('Policy enforcement action taken'),
      policyReason: z.string().optional().describe('Reason for policy enforcement'),
      handoverAppId: z.string().optional().describe('App ID involved in the handover'),
      handoverMetadata: z.string().optional().describe('Metadata passed with the handover')
    })
  )
  .output(
    z.object({
      senderId: z.string().describe('PSID of the user or affected entity'),
      recipientPageId: z.string().describe('Page ID'),
      timestamp: z.string().describe('Event timestamp'),
      accountLinkingStatus: z.string().optional().describe('linked or unlinked'),
      authorizationCode: z
        .string()
        .optional()
        .describe('Authorization code from account linking'),
      policyAction: z.string().optional().describe('Policy enforcement action taken'),
      policyReason: z.string().optional().describe('Reason for policy enforcement'),
      handoverAppId: z.string().optional().describe('App ID involved in the handover'),
      handoverMetadata: z.string().optional().describe('Metadata passed with the handover')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let request = ctx.request;

      if (request.method === 'GET') {
        return { inputs: [] };
      }

      let body = (await request.json()) as any;

      if (body.object !== 'page') {
        return { inputs: [] };
      }

      let inputs: any[] = [];

      for (let entry of body.entry || []) {
        let pageId = entry.id as string;

        for (let messagingEvent of entry.messaging || []) {
          let senderId = messagingEvent.sender?.id as string;
          let recipientId = (messagingEvent.recipient?.id as string) || pageId;
          let timestamp = String(messagingEvent.timestamp || Date.now());

          if (messagingEvent.account_linking) {
            let al = messagingEvent.account_linking;
            inputs.push({
              eventType: 'account_linking',
              eventId: `al_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              accountLinkingStatus: al.status,
              authorizationCode: al.authorization_code
            });
          }

          if (messagingEvent['policy-enforcement']) {
            let pe = messagingEvent['policy-enforcement'];
            inputs.push({
              eventType: 'policy_enforcement',
              eventId: `pe_${timestamp}_${recipientId}`,
              senderId,
              recipientId,
              timestamp,
              policyAction: pe.action,
              policyReason: pe.reason
            });
          }

          if (messagingEvent.pass_thread_control) {
            let ptc = messagingEvent.pass_thread_control;
            inputs.push({
              eventType: 'handover_pass',
              eventId: `hpass_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              handoverAppId: String(ptc.new_owner_app_id),
              handoverMetadata: ptc.metadata
            });
          }

          if (messagingEvent.take_thread_control) {
            let ttc = messagingEvent.take_thread_control;
            inputs.push({
              eventType: 'handover_take',
              eventId: `htake_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              handoverAppId: String(ttc.previous_owner_app_id),
              handoverMetadata: ttc.metadata
            });
          }

          if (messagingEvent.request_thread_control) {
            let rtc = messagingEvent.request_thread_control;
            inputs.push({
              eventType: 'handover_request',
              eventId: `hreq_${timestamp}_${senderId}`,
              senderId,
              recipientId,
              timestamp,
              handoverAppId: String(rtc.requested_owner_app_id),
              handoverMetadata: rtc.metadata
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let { input } = ctx;

      return {
        type: `account.${input.eventType}`,
        id: input.eventId,
        output: {
          senderId: input.senderId,
          recipientPageId: input.recipientId,
          timestamp: input.timestamp,
          accountLinkingStatus: input.accountLinkingStatus,
          authorizationCode: input.authorizationCode,
          policyAction: input.policyAction,
          policyReason: input.policyReason,
          handoverAppId: input.handoverAppId,
          handoverMetadata: input.handoverMetadata
        }
      };
    }
  })
  .build();
