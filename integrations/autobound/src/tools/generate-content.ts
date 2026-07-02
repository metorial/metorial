import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

let insightUsedSchema = z.object({
  insightId: z.string().describe('Unique identifier for the insight'),
  name: z.string().describe('Name of the insight used'),
  type: z.string().describe('Category of the insight'),
  score: z.number().describe('Relevance score of the insight')
});

let contentItemSchema = z.object({
  subject: z.string().optional().describe('Email subject line (for email and sequence types)'),
  content: z.string().describe('Generated content body'),
  modelUsed: z.string().describe('AI model used for generation'),
  contentItemId: z.string().describe('Unique identifier for this content item'),
  insightsUsed: z.array(insightUsedSchema).describe('Insights referenced in the content')
});

export let generateContent = SlateTool.create(spec, {
  name: 'Generate Content',
  key: 'generate_content',
  description: `Generate AI-powered personalized sales content for a prospect. Supports single emails (with subject line), multi-step email sequences, call scripts with talking points and objection handling, LinkedIn connection requests, SMS messages, email openers, and fully custom content formats.

Identify the prospect via email, LinkedIn URL, or company URL. Optionally provide seller information for better personalization. Control writing style, AI model, word count, language, and which insights to use.`,
  instructions: [
    'At least one contact identifier is required: contactEmail, contactLinkedinUrl, or contactCompanyUrl.',
    'For custom content, set contentType to "custom" and provide customContentType with natural language instructions describing the desired output.',
    'For sequences, set contentType to "sequence" and optionally specify sequenceNumberOfEmails (defaults to 3).',
    'Use contentToRewrite to have the AI rewrite existing content instead of generating from scratch.'
  ],
  constraints: [
    'Rate limited to 300 requests/minute and 50,000 requests/day.',
    'LinkedIn connection requests are capped at 300 characters.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactEmail: z.string().optional().describe('Prospect email address'),
      contactLinkedinUrl: z.string().optional().describe('Prospect LinkedIn profile URL'),
      contactCompanyUrl: z.string().optional().describe('Prospect company website URL'),
      contactName: z.string().optional().describe('Prospect name'),
      contactCompanyName: z.string().optional().describe('Prospect company name'),
      contactCompanyDomain: z.string().optional().describe('Prospect company domain'),
      contactCompanyLinkedinUrl: z
        .string()
        .optional()
        .describe('Prospect company LinkedIn URL'),
      userEmail: z.string().optional().describe('Seller email address for personalization'),
      userLinkedinUrl: z.string().optional().describe('Seller LinkedIn URL'),
      userName: z.string().optional().describe('Seller name'),
      userCompanyName: z.string().optional().describe('Seller company name'),
      userCompanyDomain: z.string().optional().describe('Seller company domain'),
      userCompanyLinkedinUrl: z.string().optional().describe('Seller company LinkedIn URL'),
      contentType: z
        .enum([
          'email',
          'sequence',
          'callScript',
          'connectionRequest',
          'sms',
          'opener',
          'custom'
        ])
        .describe('Type of content to generate'),
      writingStyle: z
        .string()
        .optional()
        .describe('Writing style (e.g., "challenger_sale", "cxo_pitch", "data_driven")'),
      wordCount: z.number().optional().describe('Desired content word count'),
      language: z.string().optional().describe('Output language'),
      additionalContext: z
        .string()
        .optional()
        .describe(
          'Freeform context to influence output (e.g., "I just left a voicemail", meeting notes, intent signals)'
        ),
      salesAsset: z
        .string()
        .optional()
        .describe(
          'Sales collateral description for the AI to reference (case studies, product pages, etc.)'
        ),
      enabledInsights: z
        .array(z.string())
        .optional()
        .describe('Specific insight types to use in content generation'),
      disabledInsights: z
        .array(z.string())
        .optional()
        .describe('Insight types to exclude from content generation'),
      model: z
        .enum(['opus', 'gpt4o', 'sonnet', 'fine_tuned'])
        .optional()
        .describe('AI model to use (trades off quality vs speed)'),
      contentToRewrite: z
        .string()
        .optional()
        .describe('Existing content template to rewrite instead of generating from scratch'),
      customContentType: z
        .string()
        .optional()
        .describe(
          'Natural language instructions for custom content format (required when contentType is "custom")'
        ),
      sequenceNumberOfEmails: z
        .number()
        .optional()
        .describe(
          'Number of emails in a sequence (defaults to 3, only for "sequence" contentType)'
        ),
      valueProposition: z
        .string()
        .optional()
        .describe('Override auto-generated value proposition')
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('Type of content generated'),
      contactEmail: z.string().describe('Resolved prospect email'),
      contactCompanyName: z.string().describe('Resolved prospect company name'),
      contactJobTitle: z.string().describe('Resolved prospect job title'),
      contentItems: z.array(contentItemSchema).describe('Generated content items'),
      salesAssetsUsed: z.array(z.any()).describe('Sales assets referenced in generation'),
      valuePropsUsed: z.array(z.any()).describe('Value propositions used in generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token);

    ctx.info('Generating personalized content...');

    let result = await client.generateContent({
      contactEmail: ctx.input.contactEmail,
      contactLinkedinUrl: ctx.input.contactLinkedinUrl,
      contactCompanyUrl: ctx.input.contactCompanyUrl,
      contactName: ctx.input.contactName,
      contactCompanyName: ctx.input.contactCompanyName,
      contactCompanyDomain: ctx.input.contactCompanyDomain,
      contactCompanyLinkedinUrl: ctx.input.contactCompanyLinkedinUrl,
      userEmail: ctx.input.userEmail,
      userLinkedinUrl: ctx.input.userLinkedinUrl,
      userName: ctx.input.userName,
      userCompanyName: ctx.input.userCompanyName,
      userCompanyDomain: ctx.input.userCompanyDomain,
      userCompanyLinkedinUrl: ctx.input.userCompanyLinkedinUrl,
      contentType: ctx.input.contentType,
      writingStyle: ctx.input.writingStyle,
      wordCount: ctx.input.wordCount,
      language: ctx.input.language,
      additionalContext: ctx.input.additionalContext,
      salesAsset: ctx.input.salesAsset,
      enabledInsights: ctx.input.enabledInsights,
      disabledInsights: ctx.input.disabledInsights,
      model: ctx.input.model,
      contentToRewrite: ctx.input.contentToRewrite,
      customContentType: ctx.input.customContentType,
      sequenceNumberOfEmails: ctx.input.sequenceNumberOfEmails,
      valueProposition: ctx.input.valueProposition
    });

    let contentCount = result.contentList?.length ?? 0;

    return {
      output: {
        contentType: result.type,
        contactEmail: result.contactEmail,
        contactCompanyName: result.contactCompanyName,
        contactJobTitle: result.contactJobTitle,
        contentItems: result.contentList ?? [],
        salesAssetsUsed: result.salesAssetsUsed ?? [],
        valuePropsUsed: result.valuePropsUsed ?? []
      },
      message: `Generated **${contentCount}** ${result.type} content item(s) for **${result.contactEmail}** at **${result.contactCompanyName}**.`
    };
  })
  .build();
