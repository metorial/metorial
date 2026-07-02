import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FinageClient } from '../lib/client';
import { spec } from '../spec';

export let newMarketNews = SlateTrigger.create(spec, {
  name: 'New Market News',
  key: 'new_market_news',
  description:
    'Triggers when new market news articles are published for a specified stock or crypto symbol.'
})
  .input(
    z.object({
      newsId: z.string().describe('Unique identifier for the news article'),
      title: z.string().describe('News headline'),
      source: z.string().optional().describe('News source'),
      description: z.string().optional().describe('Article summary'),
      url: z.string().optional().describe('Link to the full article'),
      publishedAt: z.string().optional().describe('Publication date/time'),
      symbols: z.array(z.string()).optional().describe('Related ticker symbols')
    })
  )
  .output(
    z.object({
      articleId: z.string().describe('Unique identifier for the news article'),
      title: z.string().describe('News headline'),
      source: z.string().optional().describe('News source'),
      description: z.string().optional().describe('Article summary'),
      url: z.string().optional().describe('Link to the full article'),
      publishedAt: z.string().optional().describe('Publication date/time'),
      symbols: z.array(z.string()).optional().describe('Related ticker symbols')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FinageClient({ token: ctx.auth.token });

      let pollingConfig = ctx.config as any;
      let symbol = pollingConfig?.symbol ?? 'AAPL';
      let newsType = pollingConfig?.newsType ?? 'stock';

      let data: any;
      if (newsType === 'crypto') {
        data = await client.getCryptoNews({ symbol, limit: 20 });
      } else {
        data = await client.getMarketNews(symbol.toUpperCase(), { limit: 20 });
      }

      let rawNews = data.news || data.articles || (Array.isArray(data) ? data : []);
      let seenTitles: Record<string, boolean> = (ctx.state as any)?.seenTitles || {};

      let newArticles = rawNews.filter((item: any) => {
        let articleId = item.url || item.link || item.title || '';
        return !seenTitles[articleId];
      });

      let updatedSeenTitles: Record<string, boolean> = { ...seenTitles };
      for (let item of rawNews) {
        let articleId = item.url || item.link || item.title || '';
        updatedSeenTitles[articleId] = true;
      }

      // Keep only the last 200 entries to avoid state bloat
      let keys = Object.keys(updatedSeenTitles);
      if (keys.length > 200) {
        let trimmed: Record<string, boolean> = {};
        for (let key of keys.slice(keys.length - 200)) {
          trimmed[key] = true;
        }
        updatedSeenTitles = trimmed;
      }

      let inputs = newArticles.map((item: any) => ({
        newsId: item.url || item.link || item.title || `${Date.now()}-${Math.random()}`,
        title: item.title || 'Untitled',
        source: item.source,
        description: item.description ?? item.summary,
        url: item.url ?? item.link,
        publishedAt: item.publishedAt ?? item.published_at ?? item.date,
        symbols: item.symbols ?? item.tickers ?? (item.ticker ? [item.ticker] : undefined)
      }));

      return {
        inputs,
        updatedState: {
          seenTitles: updatedSeenTitles,
          lastPollTimestamp: new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'news.published',
        id: ctx.input.newsId,
        output: {
          articleId: ctx.input.newsId,
          title: ctx.input.title,
          source: ctx.input.source,
          description: ctx.input.description,
          url: ctx.input.url,
          publishedAt: ctx.input.publishedAt,
          symbols: ctx.input.symbols
        }
      };
    }
  })
  .build();
