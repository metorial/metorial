import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { spec } from '../spec';

export let getFlexConfigurationTool = SlateTool.create(spec, {
  name: 'Get Flex Configuration',
  key: 'get_flex_configuration',
  description: `Retrieve the current Flex instance configuration. Returns UI settings, enabled channels, account SID, runtime domain, and other configuration properties that control the appearance and behavior of your Flex instance.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      accountSid: z.string().optional().describe('Account SID'),
      flexInstanceSid: z.string().optional().describe('Flex Instance SID'),
      runtimeDomain: z.string().optional().describe('Runtime domain'),
      serviceSid: z.string().optional().describe('Service SID'),
      chatServiceSid: z.string().optional().describe('Chat Service SID'),
      messagingServiceSid: z.string().optional().describe('Messaging Service SID'),
      uiLanguage: z.string().optional().describe('UI language'),
      uiVersion: z.string().optional().describe('UI version'),
      serverlessServiceSids: z
        .array(z.string())
        .optional()
        .describe('Serverless service SIDs'),
      flexInsightsSid: z.string().optional().describe('Flex Insights SID'),
      dateCreated: z.string().optional().describe('Date created'),
      dateUpdated: z.string().optional().describe('Date updated'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom configuration attributes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexClient(ctx.auth.token);
    let config = await client.getConfiguration();

    return {
      output: {
        accountSid: config.account_sid,
        flexInstanceSid: config.flex_instance_sid,
        runtimeDomain: config.runtime_domain,
        serviceSid: config.service_sid,
        chatServiceSid: config.chat_service_instance_sid,
        messagingServiceSid: config.messaging_service_instance_sid,
        uiLanguage: config.ui_language,
        uiVersion: config.ui_version,
        serverlessServiceSids: config.serverless_service_sids,
        flexInsightsSid: config.flex_insights_hr,
        dateCreated: config.date_created,
        dateUpdated: config.date_updated,
        attributes: config.attributes
      },
      message: `Flex configuration retrieved for account **${config.account_sid}**.`
    };
  })
  .build();
