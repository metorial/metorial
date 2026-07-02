import { describe, expect, it } from 'vitest';
import { jsonApiBody, listData, singleData } from './envelopes';
import { paginationFrom } from './pagination';

describe('Natural JSON:API envelopes', () => {
  it('wraps attributes and relationships without dropping intentional null values', () => {
    expect(
      jsonApiBody(
        {
          name: 'Agent',
          description: null,
          omitted: undefined
        },
        {
          agent: { data: { type: 'agent', id: 'agt_123' } }
        }
      )
    ).toEqual({
      data: {
        attributes: {
          name: 'Agent',
          description: null
        },
        relationships: {
          agent: { data: { type: 'agent', id: 'agt_123' } }
        }
      }
    });
  });

  it('unwraps list and single data records defensively', () => {
    expect(listData({ data: [{ id: 'one' }, null, 'bad'] })).toEqual([{ id: 'one' }]);
    expect(singleData({ data: { id: 'one' } })).toEqual({ id: 'one' });
    expect(singleData({ data: [] })).toEqual({});
  });

  it('parses pagination metadata', () => {
    expect(
      paginationFrom({
        meta: {
          pagination: {
            hasMore: true,
            nextCursor: 'cur_123'
          }
        }
      })
    ).toEqual({
      hasMore: true,
      nextCursor: 'cur_123'
    });
  });
});
