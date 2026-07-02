import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageAssistant = SlateTool.create(spec, {
  name: 'Manage Assistant',
  key: 'manage_assistant',
  description: `Create, update, or delete an AI assistant. Assistants define the behavior, personality, and capabilities of the AI agents that handle conversations. Configure prompts, LLM model, voice settings, and connected tools.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      assistantId: z.string().optional().describe('Required for update/delete'),
      name: z.string().optional().describe('Name of the assistant'),
      description: z.string().optional().describe('Description of the assistant'),
      assistantType: z
        .enum(['simple', 'chat', 'phone', 'nl2sql', 'realtime_openai'])
        .optional()
        .describe('Type of assistant (required for create)'),
      llmModel: z
        .string()
        .optional()
        .describe('LLM model to use, e.g. gpt-4o, gpt-3.5-turbo (required for create)'),
      systemPrompt: z
        .string()
        .optional()
        .describe('System prompt that controls agent behavior'),
      voice: z.boolean().optional().describe('Enable voice capabilities'),
      voiceLanguages: z
        .array(z.string())
        .optional()
        .describe('Supported voice languages, e.g. ["en-US", "de-DE"]'),
      webhookId: z
        .string()
        .nullable()
        .optional()
        .describe('Webhook ID for conversation events'),
      hasHumanAgent: z.boolean().optional().describe('Enable human agent handoff'),
      useTools: z.boolean().optional().describe('Enable tool usage'),
      showImages: z.boolean().optional().describe('Allow showing images in responses'),
      conversationFlowId: z.string().nullable().optional().describe('Conversation flow ID')
    })
  )
  .output(
    z.object({
      assistantId: z.string().optional().describe('ID of the assistant'),
      name: z.string().optional().describe('Name of the assistant'),
      description: z.string().optional().describe('Description'),
      assistantType: z.string().optional().describe('Type of the assistant'),
      llmModel: z.string().optional().describe('LLM model'),
      systemPrompt: z.string().optional().describe('System prompt'),
      deleted: z.boolean().optional().describe('Whether the assistant was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createAssistant({
        assistant_type: ctx.input.assistantType!,
        llm_model: ctx.input.llmModel!,
        name: ctx.input.name,
        description: ctx.input.description,
        system_prompt: ctx.input.systemPrompt,
        voice: ctx.input.voice,
        voice_languages: ctx.input.voiceLanguages,
        webhook_id: ctx.input.webhookId ?? undefined,
        has_human_agent: ctx.input.hasHumanAgent,
        use_tools: ctx.input.useTools,
        show_images: ctx.input.showImages,
        conversation_flow_id: ctx.input.conversationFlowId ?? undefined
      });
      let data = result.data || result;
      return {
        output: {
          assistantId: data.id,
          name: data.name,
          description: data.description,
          assistantType: data.assistant_type,
          llmModel: data.llm_model,
          systemPrompt: data.system_prompt
        },
        message: `Created assistant **${data.name || data.id}** (type: ${data.assistant_type}, model: ${data.llm_model}).`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateAssistant(ctx.input.assistantId!, {
        name: ctx.input.name,
        description: ctx.input.description,
        system_prompt: ctx.input.systemPrompt,
        llm_model: ctx.input.llmModel,
        voice: ctx.input.voice,
        voice_languages: ctx.input.voiceLanguages,
        webhook_id: ctx.input.webhookId,
        has_human_agent: ctx.input.hasHumanAgent,
        use_tools: ctx.input.useTools,
        show_images: ctx.input.showImages,
        conversation_flow_id: ctx.input.conversationFlowId
      });
      let data = result.data || result;
      return {
        output: {
          assistantId: data.id,
          name: data.name,
          description: data.description,
          assistantType: data.assistant_type,
          llmModel: data.llm_model,
          systemPrompt: data.system_prompt
        },
        message: `Updated assistant **${data.name || ctx.input.assistantId}**.`
      };
    }

    // delete
    await client.deleteAssistant(ctx.input.assistantId!);
    return {
      output: {
        assistantId: ctx.input.assistantId,
        deleted: true
      },
      message: `Deleted assistant \`${ctx.input.assistantId}\`.`
    };
  })
  .build();
