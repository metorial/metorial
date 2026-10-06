import { SlateTool } from 'slates';
import { z } from 'zod';
import { fetchOEmbed, findLoomUrlMatches, invalid, MAX_RESULT_BYTES } from '../lib/client';
import { spec } from '../spec';

export let replaceLoomUrls = SlateTool.create(spec, {
  name: 'Replace Loom URLs',
  key: 'replace_loom_urls',
  description: `Find all Loom video URLs in a block of text and replace them with embedded video player HTML. Scans for Loom share and embed URLs, fetches their oEmbed data, and substitutes each URL with the corresponding embed HTML. Useful for processing user-generated content, messages, or documents that contain Loom links.`,
  constraints: [
    'Each unique valid Loom URL triggers one anonymous oEmbed request; local bounds are 1 MiB input, 20 unique URLs and 2 MiB result.',
    'Invalid or unavailable URLs remain unchanged. Failed URLs are reported; urlsReplaced counts unique successful URLs, while occurrencesReplaced counts all replaced occurrences.'
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
      replacedText: z
        .string()
        .describe(
          'Text with confirmed Loom URLs replaced by native embed HTML; other text is preserved, not sanitized'
        ),
      occurrencesReplaced: z
        .number()
        .describe('Total replaced URL occurrences, including duplicates'),
      failedUrls: z
        .array(z.object({ originalUrl: z.string(), reason: z.string() }))
        .describe(
          'Valid URLs whose native metadata could not be confirmed and remain unchanged'
        ),
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
    const matches = findLoomUrlMatches(ctx.input.text),
      uniqueUrls = [...new Set(matches.map(v => v.url))];
    const successes = new Map<string, { html: string; title: string }>();
    const failedUrls: Array<{ originalUrl: string; reason: string }> = [];
    for (const url of uniqueUrls) {
      try {
        const metadata = await fetchOEmbed(url);
        successes.set(url, { html: metadata.html, title: metadata.title });
      } catch {
        failedUrls.push({
          originalUrl: url,
          reason:
            'Loom oEmbed metadata could not be confirmed. Check video visibility/availability and retry deliberately; the original URL remains unchanged.'
        });
      }
    }
    let cursor = 0,
      replacedText = '',
      occurrencesReplaced = 0,
      resultBytes = 0;
    const append = (text: string) => {
      resultBytes += Buffer.byteLength(text);
      if (resultBytes > MAX_RESULT_BYTES)
        throw invalid(
          'Replacement output exceeds the local 2 MiB bound. Split the input; metadata reads may already have occurred.'
        );
      replacedText += text;
    };
    for (const match of matches) {
      append(ctx.input.text.slice(cursor, match.index));
      const replacement = successes.get(match.url);
      append(replacement?.html ?? match.url);
      if (replacement) occurrencesReplaced++;
      cursor = match.index + match.url.length;
    }
    append(ctx.input.text.slice(cursor));
    return {
      output: {
        replacedText,
        urlsFound: matches.length,
        urlsReplaced: successes.size,
        occurrencesReplaced,
        failedUrls,
        replacedUrls: [...successes].map(([originalUrl, value]) => ({
          originalUrl,
          videoTitle: value.title
        }))
      },
      message: `Replaced ${successes.size} unique Loom URL(s) across ${occurrencesReplaced} occurrence(s). ${failedUrls.length} URL(s) could not be confirmed and remain unchanged.`
    };
  })
  .build();
