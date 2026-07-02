import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

let phoneNumberSchema = z.object({
  phoneNumberSid: z
    .string()
    .describe('Unique SID of the phone number resource (starts with PN)'),
  phoneNumber: z.string().describe('Phone number in E.164 format'),
  friendlyName: z.string().describe('Friendly name for the phone number'),
  capabilities: z
    .object({
      voice: z.boolean(),
      sms: z.boolean(),
      mms: z.boolean()
    })
    .describe('Number capabilities'),
  voiceUrl: z.string().nullable().describe('URL for handling incoming voice calls'),
  smsUrl: z.string().nullable().describe('URL for handling incoming SMS messages'),
  statusCallback: z.string().nullable().describe('Status callback URL'),
  dateCreated: z.string().nullable().describe('Date the number was provisioned')
});

export let managePhoneNumber = SlateTool.create(spec, {
  name: 'Manage Phone Number',
  key: 'manage_phone_number',
  description: `Purchase, list, update, or release phone numbers on your Twilio account. Supports purchasing new numbers, listing owned numbers, updating webhook URLs, and releasing (deleting) numbers.`,
  instructions: [
    'To purchase a number, provide "phoneNumber" in E.164 format (found via the Search Phone Numbers tool).',
    'To list owned numbers, set action to "list".',
    'To update webhook URLs, set action to "update" and provide the phoneNumberSid.',
    'To release a number, set action to "release" and provide the phoneNumberSid.'
  ],
  constraints: [
    'Purchasing a phone number incurs charges on your Twilio account.',
    'Releasing a number is irreversible — the number may not be recoverable.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['purchase', 'list', 'update', 'release']).describe('Action to perform.'),
      phoneNumber: z
        .string()
        .optional()
        .describe('E.164 phone number to purchase (for "purchase" action).'),
      phoneNumberSid: z
        .string()
        .optional()
        .describe('SID of the phone number to update or release (starts with PN).'),
      friendlyName: z.string().optional().describe('Friendly name (for purchase or update).'),
      voiceUrl: z
        .string()
        .optional()
        .describe('URL to handle incoming voice calls (for purchase or update).'),
      smsUrl: z
        .string()
        .optional()
        .describe('URL to handle incoming SMS messages (for purchase or update).'),
      statusCallbackUrl: z
        .string()
        .optional()
        .describe('URL to receive status callbacks (for purchase or update).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results for list action (max 1000, default 50).')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(phoneNumberSchema)
        .optional()
        .describe('Phone number(s) affected by the action'),
      released: z.boolean().optional().describe('Whether the number was successfully released')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let mapNumber = (n: any) => ({
      phoneNumberSid: n.sid,
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      capabilities: {
        voice: n.capabilities?.voice ?? false,
        sms: n.capabilities?.sms ?? false,
        mms: n.capabilities?.mms ?? false
      },
      voiceUrl: n.voice_url || null,
      smsUrl: n.sms_url || null,
      statusCallback: n.status_callback || null,
      dateCreated: n.date_created || null
    });

    if (ctx.input.action === 'purchase') {
      if (!ctx.input.phoneNumber)
        throw twilioServiceError('phoneNumber is required for purchase action');
      let result = await client.purchasePhoneNumber({
        phoneNumber: ctx.input.phoneNumber,
        friendlyName: ctx.input.friendlyName,
        voiceUrl: ctx.input.voiceUrl,
        smsUrl: ctx.input.smsUrl,
        statusCallback: ctx.input.statusCallbackUrl
      });
      return {
        output: { phoneNumbers: [mapNumber(result)] },
        message: `Purchased phone number **${result.phone_number}** (SID: ${result.sid}).`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.listIncomingPhoneNumbers({
        pageSize: ctx.input.pageSize
      });
      let numbers = (result.incoming_phone_numbers || []).map(mapNumber);
      return {
        output: { phoneNumbers: numbers },
        message: `Found **${numbers.length}** phone number(s) on your account.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.phoneNumberSid)
        throw twilioServiceError('phoneNumberSid is required for update action');
      let result = await client.updateIncomingPhoneNumber(ctx.input.phoneNumberSid, {
        friendlyName: ctx.input.friendlyName,
        voiceUrl: ctx.input.voiceUrl,
        smsUrl: ctx.input.smsUrl,
        statusCallback: ctx.input.statusCallbackUrl
      });
      return {
        output: { phoneNumbers: [mapNumber(result)] },
        message: `Updated phone number **${result.phone_number}** (SID: ${result.sid}).`
      };
    }

    if (ctx.input.action === 'release') {
      if (!ctx.input.phoneNumberSid)
        throw twilioServiceError('phoneNumberSid is required for release action');
      await client.releasePhoneNumber(ctx.input.phoneNumberSid);
      return {
        output: { released: true },
        message: `Released phone number **${ctx.input.phoneNumberSid}**.`
      };
    }

    throw twilioServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
