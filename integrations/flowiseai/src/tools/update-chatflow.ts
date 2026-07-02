import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let updateChatflow = SlateTool.create(spec, {
  name: 'Update Chatflow',
  key: 'update_chatflow',
  description: `Update an existing chatflow's properties such as name, flow data, deployment status, visibility, API key assignment, or category.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to update'),
      name: z.string().optional().describe('New name for the chatflow'),
      flowData: z.string().optional().describe('Updated JSON string of the flow data'),
      deployed: z.boolean().optional().describe('Set deployment status'),
      isPublic: z.boolean().optional().describe('Set public visibility'),
      apikeyid: z.string().optional().describe('API key ID to assign'),
      chatbotConfig: z.string().optional().describe('Updated chatbot configuration JSON'),
      category: z.string().optional().describe('Updated category'),
      type: z.string().optional().describe('Updated flow type')
    })
  )
  .output(
    z.object({
      chatflowId: z.string().describe('ID of the updated chatflow'),
      name: z.string().describe('Updated name'),
      deployed: z.boolean().optional().describe('Deployment status'),
      isPublic: z.boolean().optional().describe('Public visibility'),
      type: z.string().optional().nullable().describe('Flow type'),
      updatedDate: z.string().optional().describe('ISO 8601 last update date')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { chatflowId, ...updateData } = ctx.input;
    let result = await client.updateChatflow(chatflowId, updateData);

    return {
      output: {
        chatflowId: result.id,
        name: result.name,
        deployed: result.deployed,
        isPublic: result.isPublic,
        type: result.type,
        updatedDate: result.updatedDate
      },
      message: `Updated chatflow **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
