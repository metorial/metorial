import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { EodhdClient } from '../lib/client';
import { spec } from '../spec';

export let newFinancialNews = SlateTrigger.create(spec, {
  name: 'New Financial News',
  key: 'new_financial_news',
  description:
    'Triggers when new financial news articles are published, optionally filtered by ticker symbol or topic tag.'
})
  .input(
    z.object({
      articleDate: z.string().describe('Publication timestamp of the article'),
      articleTitle: z.string().describe('Article headline'),
      articleContent: z.string().describe('Article body text'),
      articleLink: z.string().describe('URL to the full article'),
      articleSymbols: z.array(z.string()).describe('Ticker symbols mentioned'),
      articleTags: z.array(z.string()).optional().nullable().describe('Topic tags'),
      sentimentPolarity: z.number().optional().nullable().describe('Sentiment polarity score'),
      sentimentNeg: z.number().optional().nullable().describe('Negative sentiment score'),
      sentimentNeu: z.number().optional().nullable().describe('Neutral sentiment score'),
      sentimentPos: z.number().optional().nullable().describe('Positive sentiment score')
    })
  )
  .output(
    z.object({
      articleTitle: z.string().describe('Article headline'),
      articleContent: z.string().describe('Article body text'),
      articleLink: z.string().describe('URL to the full article'),
      publishedAt: z.string().describe('Publication timestamp'),
      symbols: z.array(z.string()).describe('Ticker symbols mentioned in the article'),
      tags: z.array(z.string()).describe('Topic tags'),
      sentimentPolarity: z.number().optional().nullable().describe('Sentiment polarity score'),
      sentimentNeg: z.number().optional().nullable().describe('Negative sentiment score'),
      sentimentNeu: z.number().optional().nullable().describe('Neutral sentiment score'),
      sentimentPos: z.number().optional().nullable().describe('Positive sentiment score')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new EodhdClient({ token: ctx.auth.token });

      let lastPolledDate = (ctx.state as { lastPolledDate?: string })?.lastPolledDate;

      let articles = await client.getNews({
        from: lastPolledDate,
        limit: 50
      });

      let articlesList: Array<{
        date: string;
        title: string;
        content: string;
        link: string;
        symbols: string[];
        tags?: string[] | null;
        sentiment?: { polarity?: number; neg?: number; neu?: number; pos?: number } | null;
      }> = Array.isArray(articles) ? articles : [];

      if (lastPolledDate) {
        articlesList = articlesList.filter(a => a.date > lastPolledDate);
      }

      let newestDate =
        articlesList.length > 0
          ? articlesList.reduce(
              (max, a) => (a.date > max ? a.date : max),
              articlesList[0]!.date
            )
          : lastPolledDate;

      return {
        inputs: articlesList.map(article => ({
          articleDate: article.date,
          articleTitle: article.title,
          articleContent: article.content,
          articleLink: article.link,
          articleSymbols: article.symbols || [],
          articleTags: article.tags,
          sentimentPolarity: article.sentiment?.polarity ?? null,
          sentimentNeg: article.sentiment?.neg ?? null,
          sentimentNeu: article.sentiment?.neu ?? null,
          sentimentPos: article.sentiment?.pos ?? null
        })),
        updatedState: {
          lastPolledDate: newestDate
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'news.published',
        id: `${ctx.input.articleDate}-${ctx.input.articleLink}`,
        output: {
          articleTitle: ctx.input.articleTitle,
          articleContent: ctx.input.articleContent,
          articleLink: ctx.input.articleLink,
          publishedAt: ctx.input.articleDate,
          symbols: ctx.input.articleSymbols,
          tags: ctx.input.articleTags || [],
          sentimentPolarity: ctx.input.sentimentPolarity,
          sentimentNeg: ctx.input.sentimentNeg,
          sentimentNeu: ctx.input.sentimentNeu,
          sentimentPos: ctx.input.sentimentPos
        }
      };
    }
  })
  .build();
