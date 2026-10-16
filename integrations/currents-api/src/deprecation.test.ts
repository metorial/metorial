import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { getLatestNews, listLatestNews } from './tools';

describeMcpCompatibleToolSchemas('Currents API tool input schemas', provider.actions);

describe('latest news replacement contract', () => {
  it('keeps the legacy latest tool and its supported replacement registered', () => {
    expect(provider.actions).toContain(getLatestNews);
    expect(provider.actions).toContain(listLatestNews);
    expect(getLatestNews.tags?.deprecated).toBe(true);
    expect(getLatestNews.description).toMatch(
      /^DEPRECATED — use `list_latest_news` instead\./
    );
  });
});
