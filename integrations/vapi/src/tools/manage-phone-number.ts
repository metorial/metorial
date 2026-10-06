import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePhoneNumber = SlateTool.create(spec, {
  name: 'Manage Phone Number',
  key: 'manage_phone_number',
  description: `Create, update, retrieve, or delete phone numbers for inbound and outbound calling. Supports Vapi-managed numbers, Twilio, Vonage, Telnyx, and BYO (bring your own) phone numbers. Assign assistants or squads to handle inbound calls.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'delete']).describe('Action to perform'),
      phoneNumberId: z
        .string()
        .optional()
        .describe('Phone number ID (required for get, update, delete)'),
      provider: z
        .enum(['vapi', 'twilio', 'vonage', 'telnyx', 'byo-phone-number'])
        .optional()
        .describe('Phone number provider (required for create)'),
      number: z
        .string()
        .optional()
        .describe(
          'Phone number in E.164 format (required for twilio, vonage, telnyx, byo-phone-number)'
        ),
      name: z.string().max(40).optional().describe('Name for the phone number'),
      sipUri: z
        .string()
        .optional()
        .describe('SIP URI for a Vapi SIP number, instead of provisioning a telephone number'),
      twilioAccountSid: z
        .string()
        .optional()
        .describe('Required when importing a Twilio number'),
      twilioAuthToken: z
        .string()
        .optional()
        .describe('Twilio auth token, or provide both twilioApiKey and twilioApiSecret'),
      twilioApiKey: z.string().optional().describe('Twilio API key'),
      twilioApiSecret: z.string().optional().describe('Twilio API secret'),
      assistantId: z.string().optional().describe('Assistant ID to route inbound calls to'),
      squadId: z.string().optional().describe('Squad ID to route inbound calls to'),
      workflowId: z.string().optional().describe('Workflow ID to route inbound calls to'),
      credentialId: z
        .string()
        .optional()
        .describe('Credential ID (for vonage, telnyx, byo-phone-number)'),
      numberDesiredAreaCode: z
        .string()
        .optional()
        .describe('Desired area code when provisioning a Vapi number'),
      serverUrl: z.string().optional().describe('Server URL for receiving webhook events')
    })
  )
  .output(
    z.object({
      phoneNumberId: z.string().optional().describe('ID of the phone number'),
      provider: z.string().optional().describe('Phone number provider'),
      number: z.string().optional().describe('Phone number in E.164 format'),
      sipUri: z.string().optional().describe('SIP address for an inbound SIP number'),
      name: z.string().optional().describe('Name of the phone number'),
      status: z
        .string()
        .optional()
        .describe('Phone number status (active, activating, blocked)'),
      assistantId: z.string().optional().describe('Assistant ID routed to'),
      squadId: z.string().optional().describe('Squad ID routed to'),
      workflowId: z.string().optional().describe('Workflow ID routed to'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the phone number was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    let { action, phoneNumberId } = ctx.input;

    if (action === 'get') {
      if (!phoneNumberId)
        throw createApiServiceError('phoneNumberId is required for get action');
      let pn = await client.getPhoneNumber(phoneNumberId);
      return {
        output: {
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
          sipUri: pn.sipUri,
          name: pn.name,
          status: pn.status,
          assistantId: pn.assistantId,
          squadId: pn.squadId,
          workflowId: pn.workflowId,
          createdAt: pn.createdAt,
          updatedAt: pn.updatedAt
        },
        message: `Retrieved phone number **${pn.number || pn.id}**.`
      };
    }

    if (action === 'delete') {
      if (!phoneNumberId)
        throw createApiServiceError('phoneNumberId is required for delete action');
      await client.deletePhoneNumber(phoneNumberId);
      return {
        output: { phoneNumberId, deleted: true },
        message: `Deleted phone number **${phoneNumberId}**.`
      };
    }

    if (ctx.input.workflowId)
      throw createApiServiceError(
        'Vapi retired Workflows on August 18, 2026. Use assistantId or squadId.'
      );
    if (ctx.input.assistantId && ctx.input.squadId)
      throw createApiServiceError('Provide either assistantId or squadId, not both.');
    if (action === 'update' && !phoneNumberId)
      throw createApiServiceError('phoneNumberId is required for update action');
    let current =
      action === 'update' ? await client.getPhoneNumber(phoneNumberId!) : undefined;
    let provider = ctx.input.provider ?? current?.provider;
    if (current && provider !== current.provider)
      throw createApiServiceError(
        'A saved phone number provider cannot be changed. Import a new phone number instead.'
      );
    if (
      provider !== 'twilio' &&
      [
        ctx.input.twilioAccountSid,
        ctx.input.twilioAuthToken,
        ctx.input.twilioApiKey,
        ctx.input.twilioApiSecret
      ].some(value => value !== undefined)
    )
      throw createApiServiceError('Twilio credentials are supported only for Twilio numbers.');
    if (
      ctx.input.credentialId !== undefined &&
      !['vonage', 'telnyx', 'byo-phone-number'].includes(provider)
    )
      throw createApiServiceError(
        'credentialId is supported only for Vonage, Telnyx, or BYO phone numbers.'
      );
    if (ctx.input.sipUri && provider !== 'vapi')
      throw createApiServiceError('sipUri is supported only for Vapi SIP numbers.');
    if (
      ctx.input.numberDesiredAreaCode &&
      (action !== 'create' || provider !== 'vapi' || ctx.input.sipUri)
    )
      throw createApiServiceError(
        'numberDesiredAreaCode is supported only when creating a Vapi telephone number.'
      );
    if (provider === 'vapi' && ctx.input.number)
      throw createApiServiceError(
        'Vapi numbers are provisioned using numberDesiredAreaCode or sipUri. Use an imported provider for an existing telephone number.'
      );
    if (action === 'create') {
      let input = ctx.input;
      if (
        input.provider &&
        ['twilio', 'vonage', 'telnyx'].includes(input.provider) &&
        !input.number
      ) {
        throw createApiServiceError('number is required when importing a phone number.');
      }
      if (
        input.provider &&
        ['vonage', 'telnyx', 'byo-phone-number'].includes(input.provider) &&
        !input.credentialId
      ) {
        throw createApiServiceError(
          'credentialId is required for this phone provider. Configure its telephony credential in the Vapi dashboard.'
        );
      }
      if (
        input.provider === 'twilio' &&
        (!input.twilioAccountSid ||
          (!input.twilioAuthToken && !(input.twilioApiKey && input.twilioApiSecret)))
      ) {
        throw createApiServiceError(
          'Twilio import requires twilioAccountSid and either twilioAuthToken or both twilioApiKey and twilioApiSecret.'
        );
      }
    }
    let body: Record<string, any> = {};
    if (ctx.input.sipUri !== undefined) body.sipUri = ctx.input.sipUri;
    if (ctx.input.twilioAccountSid !== undefined)
      body.twilioAccountSid = ctx.input.twilioAccountSid;
    if (ctx.input.twilioAuthToken !== undefined)
      body.twilioAuthToken = ctx.input.twilioAuthToken;
    if (ctx.input.twilioApiKey !== undefined) body.twilioApiKey = ctx.input.twilioApiKey;
    if (ctx.input.twilioApiSecret !== undefined)
      body.twilioApiSecret = ctx.input.twilioApiSecret;
    if (ctx.input.provider) body.provider = ctx.input.provider;
    if (ctx.input.number) body.number = ctx.input.number;
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.assistantId) body.assistantId = ctx.input.assistantId;
    if (ctx.input.squadId) body.squadId = ctx.input.squadId;
    if (ctx.input.workflowId) body.workflowId = ctx.input.workflowId;
    if (ctx.input.credentialId) body.credentialId = ctx.input.credentialId;
    if (ctx.input.numberDesiredAreaCode)
      body.numberDesiredAreaCode = ctx.input.numberDesiredAreaCode;
    if (ctx.input.serverUrl) body.server = { ...current?.server, url: ctx.input.serverUrl };

    if (action === 'create') {
      if (!ctx.input.provider)
        throw createApiServiceError('provider is required for create action');
      let pn = await client.createPhoneNumber(body);
      return {
        output: {
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
          sipUri: pn.sipUri,
          name: pn.name,
          status: pn.status,
          assistantId: pn.assistantId,
          squadId: pn.squadId,
          workflowId: pn.workflowId,
          createdAt: pn.createdAt,
          updatedAt: pn.updatedAt
        },
        message: `Created phone number **${pn.number || pn.id}** (${pn.provider}).`
      };
    }

    if (action === 'update') {
      if (!phoneNumberId)
        throw createApiServiceError('phoneNumberId is required for update action');
      let pn = await client.updatePhoneNumber(phoneNumberId, body);
      return {
        output: {
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
          sipUri: pn.sipUri,
          name: pn.name,
          status: pn.status,
          assistantId: pn.assistantId,
          squadId: pn.squadId,
          workflowId: pn.workflowId,
          createdAt: pn.createdAt,
          updatedAt: pn.updatedAt
        },
        message: `Updated phone number **${pn.number || pn.id}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
