import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let spamKeywordSchema = z.object({
  keyword: z.string().describe('The spam trigger keyword found'),
  count: z.number().describe('Number of occurrences in the campaign')
});

let linkSchema = z.object({
  url: z.string().describe('The link URL'),
  statusCode: z.number().describe('HTTP status code (97=tel, 98=mailto, 99=invalid)'),
  redirectUrl: z.string().describe('Final redirect destination URL'),
  isImage: z.boolean().describe('Whether the link is an image source'),
  isBroken: z.boolean().describe('Whether the link returned an error status'),
  protocol: z.string().describe('URL protocol (http, https, etc.)')
});

let imageSchema = z.object({
  url: z.string().describe('The image URL'),
  sizeKb: z.number().describe('Image file size in kilobytes'),
  width: z.number().describe('Original image width in pixels'),
  height: z.number().describe('Original image height in pixels'),
  renderedWidth: z.number().describe('Rendered width in pixels as specified in HTML'),
  renderedHeight: z.number().describe('Rendered height in pixels as specified in HTML'),
  imageType: z.string().describe('Image format (png, jpg, gif, etc.)')
});

let summaryItemSchema = z.object({
  message: z.string().describe('Description of a change applied or issue found'),
  count: z.number().describe('Number of occurrences'),
  htmlModified: z.boolean().describe('Whether the HTML was modified to fix this issue')
});

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve the cleaned HTML and full analysis results for a processed campaign. Returns comprehensive diagnostics including spam analysis, link checking, image inventory, content metrics, and a summary of all changes applied.
Only works on campaigns with "completed" status.`,
  instructions: [
    'The campaign must have finished processing (status "completed") before results can be retrieved.',
    'Use the minifyHtml option to control whether the returned HTML is minified.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID returned from the Clean Campaign tool'),
      minifyHtml: z
        .boolean()
        .optional()
        .describe('Whether to minify the cleaned HTML output (default: true)')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique identifier of the campaign'),
      campaignName: z.string().describe('Name of the campaign'),
      customInfo: z.string().describe('Custom metadata passed during submission'),
      resultsTime: z.string().describe('Timestamp when results were generated'),
      campaignHtml: z.string().describe('The cleaned and optimized HTML'),
      totalWordCount: z.number().describe('Total number of words in the campaign'),
      allCapitalizedWords: z.number().describe('Number of fully capitalized words'),
      allCapitalizedWordRatio: z
        .number()
        .describe('Ratio of capitalized words to total words'),
      spamWordsCount: z.number().describe('Number of spam trigger keywords found'),
      spamKeywordRatio: z.number().describe('Ratio of spam keywords to total words'),
      spamKeywordList: z
        .array(spamKeywordSchema)
        .describe('List of detected spam trigger keywords'),
      textImageRatio: z.number().describe('Text-to-image ratio'),
      textLinkRatio: z.number().describe('Text-to-link ratio'),
      linksScanned: z.number().describe('Total number of links scanned'),
      brokenLinks: z.number().describe('Number of broken links found'),
      allLinkList: z.array(linkSchema).describe('Full list of all links in the campaign'),
      blacklistedLinksFound: z.number().describe('Number of links found on blacklists'),
      blacklistedLinks: z.array(linkSchema).describe('Links detected on known blacklists'),
      pdCdnsFound: z.number().describe('Number of poor-delivery CDNs detected'),
      pdCdnList: z.array(z.any()).describe('List of poor-delivery CDNs found'),
      domainsScanned: z.number().describe('Number of unique domains scanned'),
      imageCount: z.number().describe('Total number of images in the campaign'),
      imageList: z.array(imageSchema).describe('Inventory of all images'),
      osImageList: z.array(imageSchema).describe('Oversized images detected'),
      bgImageList: z.array(imageSchema).describe('Background images detected'),
      campaignSummary: z
        .array(summaryItemSchema)
        .describe('Summary of changes applied and issues found')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaign(ctx.input.campaignId, ctx.input.minifyHtml ?? true);

    let issues: string[] = [];
    if (result.spamWordsCount > 0) issues.push(`${result.spamWordsCount} spam keywords`);
    if (result.brokenLinks > 0) issues.push(`${result.brokenLinks} broken links`);
    if (result.blacklistedLinksFound > 0)
      issues.push(`${result.blacklistedLinksFound} blacklisted links`);
    if (result.osImageList.length > 0)
      issues.push(`${result.osImageList.length} oversized images`);

    let issuesSummary =
      issues.length > 0 ? `Issues found: ${issues.join(', ')}.` : 'No major issues found.';

    return {
      output: result,
      message: `Campaign **"${result.campaignName}"** analysis complete. ${result.totalWordCount} words, ${result.imageCount} images, ${result.linksScanned} links scanned. ${issuesSummary} ${result.campaignSummary.length} changes/observations in summary.`
    };
  })
  .build();
