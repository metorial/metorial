import { describe, expect, it } from 'vitest';
import { provider } from './index';

// Structural compatibility is local metadata; provider E2E cannot prove that old tool selections remain registered.
describe('legacy tool replacements', () => {
  for (const [legacy, replacement] of [
    ['get_earnings', 'get_earnings_history'],
    ['get_etf_details', 'get_fund_data'],
    ['get_mutual_fund_details', 'get_fund_data']
  ]) {
    it(`${legacy} remains registered and points to ${replacement}`, () => {
      const old = provider.actions.find(action => action.key === legacy);
      expect(old).toBeDefined();
      expect(provider.actions.some(action => action.key === replacement)).toBe(true);
      expect(old?.tags?.deprecated).toBe(true);
      expect(old?.description).toContain(`DEPRECATED — use \`${replacement}\` instead.`);
    });
  }
});
