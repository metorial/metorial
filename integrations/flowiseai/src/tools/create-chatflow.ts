import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let createChatflow = SlateTool.create(spec, {
  name: 'Create Chatflow',
  key: 'create_chatflow',
  description: `Create a new chatflow in Flowise. Provide a name and optionally set flow data, deployment status, visibility, API key assignment, and category.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new chatflow'),
      flowData: z
        .string()
        .optional()
        .describe('JSON string of the flow data (nodes and connections)'),
      deployed: z.boolean().optional().describe('Whether the chatflow should be deployed'),
      isPublic: z
        .boolean()
        .optional()
        .describe('Whether the chatflow should be publicly accessible'),
      apikeyid: z.string().optional().describe('API key ID to assign to this chatflow'),
      chatbotConfig: z.string().optional().describe('JSON string of chatbot configuration'),
      category: z.string().optional().describe('Category for the chatflow'),
      type: z.string().optional().describe('Type of flow: CHATFLOW or MULTIAGENT')
    })
  )
  .output(
    z.object({
      chatflowId: z.string().describe('ID of the newly created chatflow'),
      name: z.string().describe('Name of the created chatflow'),
      deployed: z.boolean().optional().describe('Deployment status'),
      isPublic: z.boolean().optional().describe('Public visibility'),
      type: z.string().optional().nullable().describe('Flow type'),
      createdDate: z.string().optional().describe('ISO 8601 creation date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.createChatflow(ctx.input);

    return {
      output: {
        chatflowId: result.id,
        name: result.name,
        deployed: result.deployed,
        isPublic: result.isPublic,
        type: result.type,
        createdDate: result.createdDate
      },
      message: `Created chatflow **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
