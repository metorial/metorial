import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let updateBot = SlateTool.create(spec, {
  name: 'Update Bot',
  key: 'update_bot',
  description: `Update an existing bot's settings including name, description, AI model, custom prompt instructions, privacy, widget appearance (color, icon, alignment), allowed domains, branding, support link, and UI labels. Only provided fields are updated.`,
  instructions: ['Widget settings are cached for up to 5 minutes on CDN after updating.']
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to update'),
      name: z.string().optional().describe('New bot name'),
      description: z.string().optional().describe('New bot description'),
      customPrompt: z
        .string()
        .optional()
        .describe('Custom system prompt instructions for the bot'),
      privacy: z.enum(['public', 'private']).optional().describe('Privacy level'),
      language: z.string().optional().describe('Language code'),
      model: z.string().optional().describe('AI model (e.g. "gpt-4o", "gpt-4o-mini")'),
      allowedDomains: z
        .array(z.string())
        .optional()
        .describe('Hostnames allowed to embed the widget (empty array = all domains)'),
      color: z.string().optional().describe('Hex color for widget (e.g. "#1292EE")'),
      icon: z
        .enum(['default', 'comments', 'robot', 'life-ring', 'question', 'book'])
        .optional()
        .describe('Widget icon'),
      alignment: z.enum(['left', 'right']).optional().describe('Widget alignment'),
      branding: z.boolean().optional().describe('Show or hide DocsBot branding'),
      supportLink: z
        .string()
        .optional()
        .describe('URL that appears after bot response for support'),
      showCopyButton: z
        .boolean()
        .optional()
        .describe('Display copy-to-clipboard button on answers'),
      hideSources: z.boolean().optional().describe('Hide answer sources from users'),
      labels: z
        .object({
          firstMessage: z.string().optional().describe('Initial bot greeting'),
          sources: z.string().optional().describe('Sources heading text'),
          getSupport: z.string().optional().describe('Support button text'),
          helpful: z.string().optional().describe('Positive rating label'),
          unhelpful: z.string().optional().describe('Negative rating label'),
          poweredBy: z.string().optional().describe('Branding text'),
          floatingButton: z.string().optional().describe('Floating widget button text'),
          inputPlaceholder: z.string().optional().describe('Input field placeholder')
        })
        .optional()
        .describe('Custom UI label overrides')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot identifier'),
      name: z.string().describe('Updated bot name'),
      description: z.string().describe('Updated bot description'),
      status: z.string().describe('Current bot status'),
      model: z.string().describe('AI model used'),
      privacy: z.string().describe('Privacy level'),
      language: z.string().describe('Language code'),
      customPrompt: z.string().optional().describe('Custom prompt instructions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let { botId, ...updateParams } = ctx.input;

    let bot = await client.updateBot(ctx.config.teamId, botId, updateParams);

    return {
      output: {
        botId: bot.id,
        name: bot.name,
        description: bot.description,
        status: bot.status,
        model: bot.model,
        privacy: bot.privacy,
        language: bot.language,
        customPrompt: bot.customPrompt
      },
      message: `Updated bot **${bot.name}** (ID: \`${bot.id}\`)`
    };
  })
  .build();
