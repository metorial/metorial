import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let telephonyEvents = SlateTrigger.create(spec, {
  name: 'Telephony Events',
  key: 'telephony_events',
  description:
    'Triggers on telephony session state changes such as setup, ringing, connected, held, and disconnected. Uses the RingCentral Subscription API to register for real-time call event notifications.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event identifier from the notification (uuid)'),
      telephonySessionId: z.string().describe('RingCentral telephony session ID'),
      parties: z
        .array(z.any())
        .describe(
          'Array of call party objects containing status, direction, from, to, and other call details'
        )
    })
  )
  .output(
    z.object({
      telephonySessionId: z.string().describe('RingCentral telephony session ID'),
      partyId: z.string().describe('ID of the primary call party'),
      direction: z.string().describe('Call direction: Inbound or Outbound'),
      callStatus: z
        .string()
        .describe(
          'Current call status (Setup, Proceeding, Answered, Disconnected, Gone, Parked, Hold, VoiceMail, FaxReceive, etc.)'
        ),
      fromNumber: z.string().describe('Caller phone number'),
      fromName: z.string().describe('Caller display name'),
      toNumber: z.string().describe('Callee phone number'),
      toName: z.string().describe('Callee display name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      let result = await client.createSubscription(
        ['/restapi/v1.0/account/~/extension/~/telephony/sessions'],
        ctx.input.webhookBaseUrl
      );

      return {
        registrationDetails: {
          subscriptionId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
      await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let validationToken = ctx.request.headers.get('Validation-Token');
      if (validationToken) {
        return {
          inputs: [],
          response: new Response('', {
            status: 200,
            headers: { 'Validation-Token': validationToken }
          })
        };
      }

      let body = (await ctx.request.json()) as any;
      let sessionData = body.body || {};

      return {
        inputs: [
          {
            eventId: body.uuid || '',
            telephonySessionId: sessionData.telephonySessionId || '',
            parties: sessionData.parties || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let party = ctx.input.parties[0] || {};
      let status = party.status?.code || party.status || '';
      let statusLower = String(status).toLowerCase();

      let type = `telephony_session.${statusLower || 'unknown'}`;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          telephonySessionId: ctx.input.telephonySessionId,
          partyId: party.id || '',
          direction: party.direction || '',
          callStatus: status,
          fromNumber: party.from?.phoneNumber || party.from?.name || '',
          fromName: party.from?.name || '',
          toNumber: party.to?.phoneNumber || party.to?.name || '',
          toName: party.to?.name || ''
        }
      };
    }
  })
  .build();
