import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let getBot = SlateTool.create(spec, {
  name: 'Get Bot',
  key: 'get_bot',
  description: `Retrieve full details for a specific bot including its configuration, model, status, widget settings, labels, and usage statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().describe('Bot ID to retrieve')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Unique bot identifier'),
      name: z.string().describe('Bot name'),
      description: z.string().describe('Bot description'),
      model: z.string().describe('AI model used'),
      privacy: z.string().describe('"public" or "private"'),
      language: z.string().describe('Language code'),
      status: z.string().describe('Bot status'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      customPrompt: z.string().optional().describe('Custom system prompt instructions'),
      questionCount: z.number().describe('Total questions asked'),
      sourceCount: z.number().describe('Number of sources'),
      pageCount: z.number().describe('Pages crawled'),
      chunkCount: z.number().describe('Document chunks indexed'),
      color: z.string().optional().describe('Widget color'),
      icon: z.string().optional().describe('Widget icon'),
      alignment: z.string().optional().describe('Widget alignment'),
      allowedDomains: z.array(z.string()).optional().describe('Allowed domains for widget'),
      branding: z.boolean().optional().describe('Branding visibility'),
      supportLink: z.string().optional().describe('Support URL'),
      hideSources: z.boolean().optional().describe('Whether sources are hidden')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let bot = await client.getBot(ctx.config.teamId, ctx.input.botId);

    return {
      output: {
        botId: bot.id,
        name: bot.name,
        description: bot.description,
        model: bot.model,
        privacy: bot.privacy,
        language: bot.language,
        status: bot.status,
        createdAt: bot.createdAt,
        customPrompt: bot.customPrompt,
        questionCount: bot.questionCount,
        sourceCount: bot.sourceCount,
        pageCount: bot.pageCount,
        chunkCount: bot.chunkCount,
        color: bot.color,
        icon: bot.icon,
        alignment: bot.alignment,
        allowedDomains: bot.allowedDomains,
        branding: bot.branding,
        supportLink: bot.supportLink,
        hideSources: bot.hideSources
      },
      message: `Bot **${bot.name}** (${bot.status}): ${bot.model}, ${bot.sourceCount} sources, ${bot.questionCount} questions`
    };
  })
  .build();
