import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getChatbotSettings = SlateTool.create(spec, {
  name: 'Get Chatbot Settings',
  key: 'get_chatbot_settings',
  description: `Retrieve the full configuration of a chatbot, including appearance settings (colors, icons, fonts, dimensions, position), behavior (welcome message, placeholder text, system prompt, default answer), AI model settings (model, temperature, topK), and escalation configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot to retrieve settings for.')
    })
  )
  .output(
    z.object({
      chatbotId: z.string().describe('The chatbot ID.'),
      name: z.string().describe('The chatbot name.'),
      description: z.string().nullable().describe('The chatbot description.'),
      welcomeMessage: z.string().nullable().describe('The welcome message shown to visitors.'),
      placeholder: z.string().nullable().describe('Placeholder text in the input field.'),
      accentColor: z.string().nullable().describe('The accent color (hex).'),
      fontSize: z.string().nullable().describe('Font size setting.'),
      headerSize: z.string().nullable().describe('Header size setting.'),
      position: z.string().nullable().describe('Widget position on page.'),
      height: z.number().nullable().describe('Widget height in pixels.'),
      gptModel: z.string().nullable().describe('The AI model used.'),
      temperature: z.number().nullable().describe('Model temperature setting.'),
      topK: z.number().nullable().describe('Top-K parameter for model.'),
      enableSources: z.boolean().describe('Whether source URLs are shown in responses.'),
      createdAt: z.string().nullable().describe('Chatbot creation timestamp.'),
      updatedAt: z.string().nullable().describe('Chatbot last update timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getChatbotSettings(ctx.input.chatbotId);

    return {
      output: {
        chatbotId: data.id?.toString() ?? ctx.input.chatbotId,
        name: data.name ?? '',
        description: data.description ?? null,
        welcomeMessage: data.welcome_message ?? null,
        placeholder: data.placeholder ?? null,
        accentColor: data.accent_color ?? null,
        fontSize: data.font_size ?? null,
        headerSize: data.header_size ?? null,
        position: data.position ?? null,
        height: data.height ?? null,
        gptModel: data.gpt_model ?? null,
        temperature: data.temperature ?? null,
        topK: data.topK ?? data.top_k ?? null,
        enableSources: Boolean(data.enable_sources),
        createdAt: data.created_at ?? null,
        updatedAt: data.updated_at ?? null
      },
      message: `Retrieved settings for chatbot **${data.name ?? ctx.input.chatbotId}**.`
    };
  })
  .build();
