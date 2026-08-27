import { describe, expect, it } from 'vitest';
import { extractNotionPageId, requireNotionPageId } from './id';

let PAGE_ID = 'be633bf1-dfa0-436d-b259-571129a590e5';
let COMPACT_PAGE_ID = 'be633bf1dfa0436db259571129a590e5';

describe('Notion page ID handling', () => {
  it('normalizes formatted and compact page IDs', () => {
    expect(extractNotionPageId(`  ${PAGE_ID.toUpperCase()}  `)).toBe(PAGE_ID);
    expect(extractNotionPageId(COMPACT_PAGE_ID)).toBe(PAGE_ID);
  });

  it('extracts the page ID from common Notion URL shapes', () => {
    expect(
      extractNotionPageId(
        `https://www.notion.so/Bug-bash-${COMPACT_PAGE_ID}?v=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
      )
    ).toBe(PAGE_ID);
    expect(extractNotionPageId(`https://app.notion.com/p/Scratchpad-${COMPACT_PAGE_ID}`)).toBe(
      PAGE_ID
    );
    expect(extractNotionPageId(`https://example.notion.site/${PAGE_ID}`)).toBe(PAGE_ID);
    expect(extractNotionPageId(`https://www.notion.so/?p=${COMPACT_PAGE_ID}`)).toBe(PAGE_ID);
  });

  it('does not mistake a database view query parameter for a page ID', () => {
    expect(
      extractNotionPageId('https://www.notion.so/workspace?v=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
    ).toBeNull();
  });

  it('rejects values that cannot identify a Notion page', () => {
    expect(extractNotionPageId('not-a-page-id')).toBeNull();
    expect(() => requireNotionPageId('not-a-page-id')).toThrow(
      'Invalid Notion page ID or URL'
    );
  });
});
