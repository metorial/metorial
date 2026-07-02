import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePhoneNumber = SlateTool.create(spec, {
  name: 'Manage Phone Number',
  key: 'manage_phone_number',
  description: `Create, update, retrieve, or delete phone numbers for inbound and outbound calling. Supports Vapi-managed numbers, Twilio, Vonage, Telnyx, and BYO (bring your own) phone numbers. Assign assistants, squads, or workflows to handle inbound calls.`,
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
      name: z.string().optional().describe('Name for the phone number'),
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
    let client = new Client(ctx.auth.token);
    let { action, phoneNumberId } = ctx.input;

    if (action === 'get') {
      if (!phoneNumberId) throw new Error('phoneNumberId is required for get action');
      let pn = await client.getPhoneNumber(phoneNumberId);
      return {
        output: {
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
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
      if (!phoneNumberId) throw new Error('phoneNumberId is required for delete action');
      await client.deletePhoneNumber(phoneNumberId);
      return {
        output: { phoneNumberId, deleted: true },
        message: `Deleted phone number **${phoneNumberId}**.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.provider) body.provider = ctx.input.provider;
    if (ctx.input.number) body.number = ctx.input.number;
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.assistantId) body.assistantId = ctx.input.assistantId;
    if (ctx.input.squadId) body.squadId = ctx.input.squadId;
    if (ctx.input.workflowId) body.workflowId = ctx.input.workflowId;
    if (ctx.input.credentialId) body.credentialId = ctx.input.credentialId;
    if (ctx.input.numberDesiredAreaCode)
      body.numberDesiredAreaCode = ctx.input.numberDesiredAreaCode;
    if (ctx.input.serverUrl) body.server = { url: ctx.input.serverUrl };

    if (action === 'create') {
      if (!ctx.input.provider) throw new Error('provider is required for create action');
      let pn = await client.createPhoneNumber(body);
      return {
        output: {
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
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
      if (!phoneNumberId) throw new Error('phoneNumberId is required for update action');
      let pn = await client.updatePhoneNumber(phoneNumberId, body);
      return {
        output: {
          phoneNumberId: pn.id,
          provider: pn.provider,
          number: pn.number,
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

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
