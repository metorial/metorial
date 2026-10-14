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
  insightsUsed: z.array(insightUsedSchema).describe('Insights referenced in the content'),
  step: z.number().nullable().optional().describe('Step number for sequence content'),
  characterCount: z
    .number()
    .nullable()
    .optional()
    .describe('Generated content character count'),
  salesAssetsUsed: z
    .array(z.any())
    .nullable()
    .optional()
    .describe('Sales assets used for this content item'),
  valuePropsUsed: z
    .array(z.any())
    .nullable()
    .optional()
    .describe('Value propositions used for this content item')
});

export let generateContent = SlateTool.create(spec, {
  name: 'Generate Content',
  key: 'generate_content',
  description: `Generate AI-powered personalized sales content for a prospect. Supports single emails (with subject line), multi-step email sequences, call scripts with talking points and objection handling, LinkedIn connection requests, SMS messages, email openers, and fully custom content formats.

Identify the prospect and seller by email or LinkedIn URL. Company URLs override their resolved company information. Control writing style, AI model, word count, language, and which insights to use.`,
  instructions: [
    'Provide contactEmail or contactLinkedinUrl, and userEmail or userLinkedinUrl. Company URLs are overrides, not contact or seller identifiers.',
    'For custom content, set contentType to "custom" and provide customContentType with natural language instructions describing the desired output.',
    'For sequences, set contentType to "sequence" and optionally specify sequenceNumberOfEmails (defaults to 3).',
    'Use contentToRewrite to have the AI rewrite existing content instead of generating from scratch.',
    'For a custom writing style, set writingStyle to custom and provide customWritingStyle.',
    'Use n to request up to three content alternatives, except for sequences.'
  ],
  constraints: [
    'Requires Content API access under an Autobound sales agreement.',
    'Rate limited to 300 requests/minute and 50,000 requests/day.',
    'LinkedIn connection requests are capped at 300 characters.'
  ],
  tags: {
    readOnly: true
  }
})
  .authMethods(['api_key'])
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
      userCompanyUrl: z
        .string()
        .optional()
        .describe('Override the resolved seller company URL'),
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
        .describe(
          'Writing style (e.g., "challenger_sale", "cxo_pitch", "data_driven", or "custom")'
        ),
      customWritingStyle: z
        .string()
        .optional()
        .describe(
          'Custom style instructions, required when writingStyle is custom. Up to 10,000 characters.'
        ),
      n: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .describe('Number of content alternatives, from 1 to 3. Not supported for sequences.'),
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
        .enum([
          'opus',
          'gpt4o',
          'sonnet',
          'fine_tuned',
          'sonnet_3.5',
          'gemini_pro_1.5',
          'gemini_flash_1.5',
          'gemini'
        ])
        .optional()
        .describe(
          'AI model for email or sequence content. sonnet is accepted as an alias for sonnet_3.5.'
        ),
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
      contactEmail: z
        .string()
        .describe('Resolved prospect email, or an empty string when unresolved'),
      contactCompanyName: z
        .string()
        .describe('Resolved prospect company name, or an empty string when unresolved'),
      contactJobTitle: z
        .string()
        .describe('Resolved prospect job title, or an empty string when unresolved'),
      contentItems: z.array(contentItemSchema).describe('Generated content items'),
      salesAssetsUsed: z.array(z.any()).describe('Sales assets referenced in generation'),
      valuePropsUsed: z.array(z.any()).describe('Value propositions used in generation'),
      insightsUsed: z
        .array(insightUsedSchema)
        .optional()
        .describe('Insights used for the full sequence'),
      rawResponse: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Complete provider response, including unresolved values and additional content metadata'
        )
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
      userCompanyUrl: ctx.input.userCompanyUrl,
      userCompanyLinkedinUrl: ctx.input.userCompanyLinkedinUrl,
      contentType: ctx.input.contentType,
      writingStyle: ctx.input.writingStyle,
      customWritingStyle: ctx.input.customWritingStyle,
      n: ctx.input.n,
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
        contactEmail: result.contactEmail ?? '',
        contactCompanyName: result.contactCompanyName ?? '',
        contactJobTitle: result.contactJobTitle ?? '',
        contentItems: (result.contentList ?? []).map(item => ({
          ...item,
          subject: item.subject ?? undefined,
          insightsUsed: item.insightsUsed ?? []
        })),
        salesAssetsUsed:
          result.salesAssetsUsed ??
          result.contentList.flatMap(item => item.salesAssetsUsed ?? []),
        valuePropsUsed:
          result.valuePropsUsed ??
          result.contentList.flatMap(item => item.valuePropsUsed ?? []),
        insightsUsed: result.insightsUsed ?? [],
        rawResponse: result
      },
      message: `Generated **${contentCount}** ${result.type} content item(s) for the prospect.`
    };
  })
  .build();
