import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { spec } from '../spec';

let flexFlowSchema = z.object({
  flexFlowSid: z.string().describe('Flex Flow SID'),
  friendlyName: z.string().optional().describe('Friendly name'),
  channelType: z
    .string()
    .optional()
    .describe('Channel type (web, sms, facebook, whatsapp, custom)'),
  integrationType: z.string().optional().describe('Integration type (studio, external, task)'),
  contactIdentity: z.string().optional().describe('Contact identity'),
  enabled: z.boolean().optional().describe('Whether the Flex Flow is enabled'),
  chatServiceSid: z.string().optional().describe('Chat Service SID'),
  integrationFlowSid: z
    .string()
    .optional()
    .describe('Studio Flow SID (for studio integration)'),
  integrationUrl: z.string().optional().describe('Webhook URL (for external integration)'),
  dateCreated: z.string().optional().describe('Date created'),
  dateUpdated: z.string().optional().describe('Date updated')
});

export let manageFlexFlowsTool = SlateTool.create(spec, {
  name: 'Manage Flex Flows',
  key: 'manage_flex_flows',
  description: `Create, read, update, delete, or list Flex Flows. A Flex Flow defines how incoming messages on a given channel (SMS, WhatsApp, web chat, etc.) are routed into the Flex contact center. It links a messaging channel to Flex and specifies the integration type (Studio flow, external webhook, or direct task creation).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'list'])
        .describe('Action to perform'),
      flexFlowSid: z
        .string()
        .optional()
        .describe('Flex Flow SID (required for get/update/delete)'),
      friendlyName: z.string().optional().describe('Friendly name'),
      chatServiceSid: z.string().optional().describe('Chat Service SID'),
      channelType: z
        .enum(['web', 'sms', 'facebook', 'whatsapp', 'custom'])
        .optional()
        .describe('Channel type'),
      contactIdentity: z.string().optional().describe('Contact identity'),
      enabled: z.boolean().optional().describe('Whether the Flex Flow is enabled'),
      integrationType: z
        .enum(['studio', 'external', 'task'])
        .optional()
        .describe('Integration type'),
      integrationFlowSid: z
        .string()
        .optional()
        .describe('Studio Flow SID (for studio integration)'),
      integrationUrl: z.string().optional().describe('Webhook URL (for external integration)'),
      integrationWorkspaceSid: z
        .string()
        .optional()
        .describe('TaskRouter Workspace SID (for task integration)'),
      integrationWorkflowSid: z
        .string()
        .optional()
        .describe('TaskRouter Workflow SID (for task integration)'),
      integrationChannel: z
        .string()
        .optional()
        .describe('TaskRouter channel unique name (for task integration)'),
      pageSize: z.number().optional().describe('Number of results to return')
    })
  )
  .output(
    z.object({
      flexFlows: z.array(flexFlowSchema).describe('Flex Flow records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexClient(ctx.auth.token);

    if (ctx.input.action === 'list') {
      let result = await client.listFlexFlows(ctx.input.pageSize);
      let flexFlows = (result.flex_flows || []).map((f: any) => ({
        flexFlowSid: f.sid,
        friendlyName: f.friendly_name,
        channelType: f.channel_type,
        integrationType: f.integration_type,
        contactIdentity: f.contact_identity,
        enabled: f.enabled,
        chatServiceSid: f.chat_service_sid,
        integrationFlowSid: f.integration?.flow_sid,
        integrationUrl: f.integration?.url,
        dateCreated: f.date_created,
        dateUpdated: f.date_updated
      }));
      return {
        output: { flexFlows },
        message: `Found **${flexFlows.length}** Flex Flows.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.flexFlowSid) throw new Error('flexFlowSid is required');
      let f = await client.getFlexFlow(ctx.input.flexFlowSid);
      return {
        output: {
          flexFlows: [
            {
              flexFlowSid: f.sid,
              friendlyName: f.friendly_name,
              channelType: f.channel_type,
              integrationType: f.integration_type,
              contactIdentity: f.contact_identity,
              enabled: f.enabled,
              chatServiceSid: f.chat_service_sid,
              integrationFlowSid: f.integration?.flow_sid,
              integrationUrl: f.integration?.url,
              dateCreated: f.date_created,
              dateUpdated: f.date_updated
            }
          ]
        },
        message: `Flex Flow **${f.friendly_name}** (${f.sid}) — channel: **${f.channel_type}**, integration: **${f.integration_type}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.friendlyName) throw new Error('friendlyName is required');
      if (!ctx.input.chatServiceSid) throw new Error('chatServiceSid is required');
      if (!ctx.input.channelType) throw new Error('channelType is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        ChatServiceSid: ctx.input.chatServiceSid,
        ChannelType: ctx.input.channelType,
        ContactIdentity: ctx.input.contactIdentity,
        Enabled: ctx.input.enabled?.toString(),
        IntegrationType: ctx.input.integrationType,
        'Integration.FlowSid': ctx.input.integrationFlowSid,
        'Integration.Url': ctx.input.integrationUrl,
        'Integration.WorkspaceSid': ctx.input.integrationWorkspaceSid,
        'Integration.WorkflowSid': ctx.input.integrationWorkflowSid,
        'Integration.Channel': ctx.input.integrationChannel
      };
      let f = await client.createFlexFlow(params);
      return {
        output: {
          flexFlows: [
            {
              flexFlowSid: f.sid,
              friendlyName: f.friendly_name,
              channelType: f.channel_type,
              integrationType: f.integration_type,
              contactIdentity: f.contact_identity,
              enabled: f.enabled,
              chatServiceSid: f.chat_service_sid,
              integrationFlowSid: f.integration?.flow_sid,
              integrationUrl: f.integration?.url,
              dateCreated: f.date_created,
              dateUpdated: f.date_updated
            }
          ]
        },
        message: `Created Flex Flow **${f.friendly_name}** (${f.sid}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.flexFlowSid) throw new Error('flexFlowSid is required');
      let params: Record<string, string | undefined> = {
        FriendlyName: ctx.input.friendlyName,
        ChatServiceSid: ctx.input.chatServiceSid,
        ChannelType: ctx.input.channelType,
        ContactIdentity: ctx.input.contactIdentity,
        Enabled: ctx.input.enabled?.toString(),
        IntegrationType: ctx.input.integrationType,
        'Integration.FlowSid': ctx.input.integrationFlowSid,
        'Integration.Url': ctx.input.integrationUrl,
        'Integration.WorkspaceSid': ctx.input.integrationWorkspaceSid,
        'Integration.WorkflowSid': ctx.input.integrationWorkflowSid,
        'Integration.Channel': ctx.input.integrationChannel
      };
      let f = await client.updateFlexFlow(ctx.input.flexFlowSid, params);
      return {
        output: {
          flexFlows: [
            {
              flexFlowSid: f.sid,
              friendlyName: f.friendly_name,
              channelType: f.channel_type,
              integrationType: f.integration_type,
              contactIdentity: f.contact_identity,
              enabled: f.enabled,
              chatServiceSid: f.chat_service_sid,
              integrationFlowSid: f.integration?.flow_sid,
              integrationUrl: f.integration?.url,
              dateCreated: f.date_created,
              dateUpdated: f.date_updated
            }
          ]
        },
        message: `Updated Flex Flow **${f.friendly_name}** (${f.sid}).`
      };
    }

    // delete
    if (!ctx.input.flexFlowSid) throw new Error('flexFlowSid is required');
    await client.deleteFlexFlow(ctx.input.flexFlowSid);
    return {
      output: {
        flexFlows: [
          {
            flexFlowSid: ctx.input.flexFlowSid
          }
        ]
      },
      message: `Deleted Flex Flow **${ctx.input.flexFlowSid}**.`
    };
  })
  .build();
