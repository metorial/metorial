import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

let chatflowSchema = z.object({
  chatflowId: z.string().describe('Unique identifier of the chatflow'),
  name: z.string().describe('Name of the chatflow'),
  flowData: z
    .string()
    .optional()
    .describe('JSON string of the flow data (nodes and connections)'),
  deployed: z.boolean().optional().describe('Whether the chatflow is deployed'),
  isPublic: z.boolean().optional().describe('Whether the chatflow is publicly accessible'),
  apikeyid: z.string().optional().nullable().describe('ID of the assigned API key'),
  chatbotConfig: z
    .string()
    .optional()
    .nullable()
    .describe('JSON string of chatbot configuration'),
  category: z.string().optional().nullable().describe('Category of the chatflow'),
  type: z.string().optional().nullable().describe('Type: CHATFLOW, MULTIAGENT, etc.'),
  createdDate: z.string().optional().describe('ISO 8601 creation date'),
  updatedDate: z.string().optional().describe('ISO 8601 last update date')
});

export let listChatflows = SlateTool.create(spec, {
  name: 'List Chatflows',
  key: 'list_chatflows',
  description: `Retrieve all chatflows from the Flowise instance. Returns the full list of chatflows including their name, deployment status, type, and configuration.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      chatflows: z.array(chatflowSchema).describe('List of chatflows')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.listChatflows();
    let chatflows = Array.isArray(result) ? result : [];

    return {
      output: {
        chatflows: chatflows.map((cf: any) => ({
          chatflowId: cf.id,
          name: cf.name,
          flowData: cf.flowData,
          deployed: cf.deployed,
          isPublic: cf.isPublic,
          apikeyid: cf.apikeyid,
          chatbotConfig: cf.chatbotConfig,
          category: cf.category,
          type: cf.type,
          createdDate: cf.createdDate,
          updatedDate: cf.updatedDate
        }))
      },
      message: `Found **${chatflows.length}** chatflow(s).`
    };
  })
  .build();
