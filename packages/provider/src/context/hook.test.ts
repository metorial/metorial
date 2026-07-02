import { describe, expect, it } from 'vitest';
import { SlateContext } from './context';
import { runWithContext } from './hook';

describe('slate context hook', () => {
  it('shares context storage across duplicate module instances', async () => {
    // @ts-expect-error Vite treats the query as a distinct module instance.
    let duplicateHook: typeof import('./hook') = await import('./hook?duplicate-instance');
    let context = new SlateContext(
      {},
      {},
      {},
      {} as any,
      {
        debug: () => {},
        error: () => {},
        info: () => {},
        progress: () => {},
        warn: () => {}
      } as any
    );

    let result = await runWithContext(context, async () => duplicateHook.getCurrentContext());

    expect(result).toBe(context);
  });
});
