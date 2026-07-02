import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let surroundingDivSchema = z
  .object({
    maxWidth: z
      .number()
      .optional()
      .describe('Campaign width in pixels (typically 600 or 900)'),
    textAlign: z
      .enum(['left', 'center', 'right'])
      .optional()
      .describe('Text alignment within the surrounding div'),
    fontSize: z
      .number()
      .optional()
      .describe('Default font size in pixels for the surrounding div'),
    centerToParent: z
      .boolean()
      .optional()
      .describe('Whether to center the div within its parent element')
  })
  .optional()
  .describe('Wraps campaign HTML in a styled div with these settings');

export let cleanCampaign = SlateTool.create(spec, {
  name: 'Clean Campaign',
  key: 'clean_campaign',
  description: `Submit an HTML email campaign for automated cleaning and optimization. Campaign Cleaner sanitizes HTML, inlines CSS, adjusts spam-triggering fonts, replaces unsafe characters, checks links, and optimizes images.
Returns a campaign ID that can be used to retrieve results once processing completes. Processing typically takes seconds but may take longer for campaigns with many images/links.`,
  instructions: [
    'Provide the full HTML of the email campaign and a descriptive campaign name.',
    'All optional settings use sensible defaults if omitted. Only override settings you specifically need to change.',
    'Use the Get Campaign tool with the returned campaign ID to retrieve the cleaned HTML and analysis once processing completes.'
  ],
  constraints: [
    'Each submission consumes one credit from your account.',
    'Custom info is limited to 500 characters.',
    'Campaign name must pass sanitization checks.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignHtml: z.string().describe('The full HTML content of the email campaign'),
      campaignName: z.string().describe('A descriptive name for the campaign'),
      inlineCss: z
        .boolean()
        .optional()
        .describe(
          'Inline CSS styles into HTML elements for email client compatibility (default: true)'
        ),
      inlineCssImportant: z
        .boolean()
        .optional()
        .describe('Add !important flag to inlined CSS styles (default: false)'),
      preserveMediaQueries: z
        .boolean()
        .optional()
        .describe('Retain media queries in the output (default: true)'),
      mediaQueriesImportant: z
        .boolean()
        .optional()
        .describe('Mark all media queries with !important (default: true)'),
      removeCssInheritance: z
        .boolean()
        .optional()
        .describe('Remove redundant inherited CSS properties after inlining (default: true)'),
      adjustFontColors: z
        .boolean()
        .optional()
        .describe('Adjust spam-triggering font colors to safe alternatives (default: true)'),
      adjustFontSize: z
        .boolean()
        .optional()
        .describe('Enable min/max font size enforcement (default: true)'),
      minFontSizeAllowed: z
        .number()
        .optional()
        .describe('Minimum allowed font size in pixels (default: 10)'),
      maxFontSizeAllowed: z
        .number()
        .optional()
        .describe('Maximum allowed font size in pixels (default: 32)'),
      replaceDiacritics: z
        .boolean()
        .optional()
        .describe('Replace diacritic characters with ASCII equivalents (default: true)'),
      replaceNonAsciiCharacters: z
        .boolean()
        .optional()
        .describe('Replace non-ASCII characters with ASCII equivalents (default: true)'),
      removeComments: z
        .boolean()
        .optional()
        .describe('Strip HTML and CSS comments (default: true)'),
      removeClassesAndIds: z
        .boolean()
        .optional()
        .describe('Remove class and ID attributes after CSS inlining (default: true)'),
      removeControlNonPrintable: z
        .boolean()
        .optional()
        .describe('Remove non-printable and control characters (default: true)'),
      removeSuccessivePunctuation: z
        .boolean()
        .optional()
        .describe('Reduce repeated punctuation to single occurrence (default: false)'),
      convertHToPTags: z
        .boolean()
        .optional()
        .describe('Convert heading tags to paragraph tags (default: false)'),
      convertTablesToDivs: z
        .boolean()
        .optional()
        .describe('Experimental: convert tables to divs (default: false)'),
      resizeAndHost: z
        .boolean()
        .optional()
        .describe('Resize, convert, and host images on Campaign Cleaner CDN (default: false)'),
      hostExtensionlessImages: z
        .boolean()
        .optional()
        .describe(
          'Host extensionless images on CDN when resizeAndHost is true (default: false)'
        ),
      imageMaxWidth: z
        .number()
        .optional()
        .describe('Maximum width style applied to all images in pixels'),
      removeImageHeight: z
        .boolean()
        .optional()
        .describe('Remove height styling from images to prevent distortion (default: false)'),
      removeLargeWidthsOver: z
        .number()
        .optional()
        .describe('Remove widths exceeding this value on non-image/table tags'),
      surroundingDiv: surroundingDivSchema,
      relativeLinksBaseUrl: z
        .string()
        .optional()
        .describe('Base URL for converting relative paths to absolute URLs'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive campaign results when processing completes'),
      customInfo: z
        .string()
        .optional()
        .describe('Custom metadata (max 500 chars) returned with campaign results')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique identifier for the submitted campaign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendCampaign(ctx.input);

    return {
      output: {
        campaignId: result.campaignId
      },
      message: `Campaign **"${ctx.input.campaignName}"** submitted for processing. Campaign ID: \`${result.campaignId}\`. Use the Get Campaign tool to retrieve results once processing completes.`
    };
  })
  .build();
