import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let getChatflow = SlateTool.create(spec, {
  name: 'Get Chatflow',
  key: 'get_chatflow',
  description: `Retrieve detailed information about a specific chatflow by its ID, including flow data, deployment status, and configuration.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to retrieve')
    })
  )
  .output(
    z.object({
      chatflowId: z.string().describe('Unique identifier of the chatflow'),
      name: z.string().describe('Name of the chatflow'),
      flowData: z.string().optional().describe('JSON string of the flow data'),
      deployed: z.boolean().optional().describe('Whether the chatflow is deployed'),
      isPublic: z.boolean().optional().describe('Whether the chatflow is publicly accessible'),
      apikeyid: z.string().optional().nullable().describe('ID of the assigned API key'),
      chatbotConfig: z
        .string()
        .optional()
        .nullable()
        .describe('JSON string of chatbot config'),
      apiConfig: z.string().optional().nullable().describe('JSON string of API config'),
      analytic: z.string().optional().nullable().describe('Analytics configuration'),
      category: z.string().optional().nullable().describe('Category of the chatflow'),
      type: z.string().optional().nullable().describe('Type: CHATFLOW, MULTIAGENT, etc.'),
      createdDate: z.string().optional().describe('ISO 8601 creation date'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let cf = await client.getChatflow(ctx.input.chatflowId);

    return {
      output: {
        chatflowId: cf.id,
        name: cf.name,
        flowData: cf.flowData,
        deployed: cf.deployed,
        isPublic: cf.isPublic,
        apikeyid: cf.apikeyid,
        chatbotConfig: cf.chatbotConfig,
        apiConfig: cf.apiConfig,
        analytic: cf.analytic,
        category: cf.category,
        type: cf.type,
        createdDate: cf.createdDate,
        updatedDate: cf.updatedDate
      },
      message: `Retrieved chatflow **${cf.name}** (\`${cf.id}\`).`
    };
  })
  .build();
