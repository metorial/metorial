import { describe, expect, it, vi } from 'vitest';
import { getNotionBlockTree } from './block-tree';

describe('getNotionBlockTree', () => {
  it('paginates each level and recursively attaches nested children', async () => {
    let getBlockChildren = vi.fn(async (blockId: string, startCursor?: string) => {
      if (blockId === 'page-id' && startCursor === undefined) {
        return {
          results: [
            { id: 'paragraph-1', type: 'paragraph', has_children: false },
            { id: 'toggle-1', type: 'toggle', has_children: true }
          ],
          has_more: true,
          next_cursor: 'page-2'
        };
      }
      if (blockId === 'page-id' && startCursor === 'page-2') {
        return {
          results: [{ id: 'divider-1', type: 'divider', has_children: false }],
          has_more: false,
          next_cursor: null
        };
      }
      if (blockId === 'toggle-1') {
        return {
          results: [{ id: 'paragraph-2', type: 'paragraph', has_children: false }],
          has_more: false,
          next_cursor: null
        };
      }
      throw new Error(`Unexpected block request: ${blockId} ${startCursor ?? ''}`);
    });

    let tree = await getNotionBlockTree({ getBlockChildren }, 'page-id');

    expect(tree).toEqual([
      { id: 'paragraph-1', type: 'paragraph', has_children: false },
      {
        id: 'toggle-1',
        type: 'toggle',
        has_children: true,
        children: [{ id: 'paragraph-2', type: 'paragraph', has_children: false }]
      },
      { id: 'divider-1', type: 'divider', has_children: false }
    ]);
    expect(getBlockChildren).toHaveBeenCalledTimes(3);
  });
});
