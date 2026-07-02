import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { spec } from '../spec';

let hashtagSchema = z.object({
  tag: z.string().describe('Hashtag text without the # symbol'),
  tweets: z.number().describe('Number of tweets using this hashtag per hour'),
  exposure: z.number().describe('Estimated reach/exposure per hour'),
  retweets: z.number().describe('Number of retweets per hour'),
  images: z.number().describe('Percentage of tweets with images'),
  links: z.number().describe('Percentage of tweets with links'),
  mentions: z.number().describe('Percentage of tweets with mentions'),
  color: z.number().describe('Color grade: 1=unused, 2=overused, 3=good, 4=great/trending')
});

export let hashtagSuggestions = SlateTool.create(spec, {
  name: 'Hashtag Suggestions',
  key: 'hashtag_suggestions',
  description: `Suggests relevant hashtags for a topic, text, image, or URL. Returns hashtags ranked by both semantic relevancy and real-time popularity with detailed engagement metrics.
Use this when you need hashtag ideas for social media content based on text topics, article URLs, or image content.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      text: z
        .string()
        .optional()
        .describe('Topic or text up to 1,000 characters to get hashtag suggestions for'),
      imageUrl: z
        .string()
        .optional()
        .describe(
          'URL of an image to generate hashtag suggestions from based on image content'
        ),
      pageUrl: z
        .string()
        .optional()
        .describe('URL of a web page to generate hashtag suggestions based on its content')
    })
  )
  .output(
    z.object({
      hashtags: z
        .array(hashtagSchema)
        .describe('List of suggested hashtags with engagement metrics')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });

    let hashtags: Array<{
      tag: string;
      tweets: number;
      exposure: number;
      retweets: number;
      images: number;
      links: number;
      mentions: number;
      color: number;
    }> = [];

    if (ctx.input.imageUrl) {
      let result = await client.hashtagSuggestionsForImage(ctx.input.imageUrl);
      hashtags = result.data || [];
    } else if (ctx.input.pageUrl) {
      let result = await client.hashtagsForUrl(ctx.input.pageUrl);
      hashtags = result.data || [];
    } else if (ctx.input.text) {
      let result = await client.hashtagSuggestions(ctx.input.text);
      hashtags = result.data || [];
    } else {
      throw new Error('At least one of text, imageUrl, or pageUrl must be provided');
    }

    let source = ctx.input.imageUrl ? 'image' : ctx.input.pageUrl ? 'URL' : 'text';

    return {
      output: { hashtags },
      message: `Found **${hashtags.length}** hashtag suggestions based on ${source}. Top suggestions: ${hashtags
        .slice(0, 5)
        .map(h => `#${h.tag}`)
        .join(', ')}`
    };
  })
  .build();
