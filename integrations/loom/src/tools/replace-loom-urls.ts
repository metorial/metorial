import { SlateTool } from 'slates';
import { z } from 'zod';
import { fetchOEmbed, findLoomUrls } from '../lib/client';
import { spec } from '../spec';

export let replaceLoomUrls = SlateTool.create(spec, {
  name: 'Replace Loom URLs',
  key: 'replace_loom_urls',
  description: `Find all Loom video URLs in a block of text and replace them with embedded video player HTML. Scans for Loom share and embed URLs, fetches their oEmbed data, and substitutes each URL with the corresponding embed HTML. Useful for processing user-generated content, messages, or documents that contain Loom links.`,
  constraints: [
    'Each unique Loom URL found triggers a separate oEmbed API request.',
    'Invalid or inaccessible Loom URLs are left unchanged in the text.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      text: z.string().describe('Text content containing Loom URLs to replace with embed HTML')
    })
  )
  .output(
    z.object({
      replacedText: z.string().describe('Text with Loom URLs replaced by embed HTML'),
      urlsFound: z.number().describe('Number of Loom URLs found in the text'),
      urlsReplaced: z.number().describe('Number of URLs successfully replaced with embeds'),
      replacedUrls: z
        .array(
          z.object({
            originalUrl: z.string().describe('The original Loom URL that was found'),
            videoTitle: z.string().describe('Title of the embedded video')
          })
        )
        .describe('Details of each URL that was replaced')
    })
  )
  .handleInvocation(async ctx => {
    let urls = findLoomUrls(ctx.input.text);

    if (urls.length === 0) {
      return {
        output: {
          replacedText: ctx.input.text,
          urlsFound: 0,
          urlsReplaced: 0,
          replacedUrls: []
        },
        message: 'No Loom URLs found in the provided text.'
      };
    }

    ctx.info(`Found ${urls.length} Loom URL(s) in the text.`);

    let uniqueUrls = [...new Set(urls)];
    let replacedText = ctx.input.text;
    let replacedUrls: Array<{ originalUrl: string; videoTitle: string }> = [];
    let urlsReplaced = 0;

    for (let url of uniqueUrls) {
      try {
        let metadata = await fetchOEmbed(url);
        replacedText = replacedText.split(url).join(metadata.html);
        replacedUrls.push({
          originalUrl: url,
          videoTitle: metadata.title
        });
        urlsReplaced++;
      } catch (_err) {
        ctx.warn(`Failed to fetch oEmbed for URL: ${url}`);
      }
    }

    return {
      output: {
        replacedText,
        urlsFound: urls.length,
        urlsReplaced,
        replacedUrls
      },
      message: `Replaced **${urlsReplaced}** of **${urls.length}** Loom URL(s) with embedded video players.`
    };
  })
  .build();
