import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let manageCampaignContentTool = SlateTool.create(spec, {
  name: 'Manage Campaign Content',
  key: 'manage_campaign_content',
  description: `Get or set the HTML/plain-text content of a campaign. Use to read the current content or update it with custom HTML, plain text, or a template-based approach.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID'),
      html: z.string().optional().describe('Full HTML content for the campaign'),
      plainText: z.string().optional().describe('Plain text content for the campaign'),
      templateId: z.number().optional().describe('Template ID to use for the content'),
      templateSections: z
        .record(z.string(), z.string())
        .optional()
        .describe('Template section content overrides (key=section name, value=HTML content)')
    })
  )
  .output(
    z.object({
      campaignId: z.string(),
      html: z.string().optional(),
      plainText: z.string().optional(),
      archiveHtml: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailchimpClient({
      token: ctx.auth.token,
      serverPrefix: ctx.auth.serverPrefix
    });

    let hasUpdate =
      ctx.input.html ||
      ctx.input.plainText ||
      ctx.input.templateId ||
      ctx.input.templateSections;

    if (hasUpdate) {
      let data: Record<string, any> = {};
      if (ctx.input.html) data.html = ctx.input.html;
      if (ctx.input.plainText) data.plain_text = ctx.input.plainText;
      if (ctx.input.templateId) {
        data.template = { id: ctx.input.templateId };
        if (ctx.input.templateSections) data.template.sections = ctx.input.templateSections;
      }

      let result = await client.setCampaignContent(ctx.input.campaignId, data);
      return {
        output: {
          campaignId: ctx.input.campaignId,
          html: result.html,
          plainText: result.plain_text,
          archiveHtml: result.archive_html
        },
        message: `Campaign **${ctx.input.campaignId}** content has been updated.`
      };
    }

    let result = await client.getCampaignContent(ctx.input.campaignId);
    return {
      output: {
        campaignId: ctx.input.campaignId,
        html: result.html,
        plainText: result.plain_text,
        archiveHtml: result.archive_html
      },
      message: `Retrieved content for campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
