import { beforeEach, describe, expect, it, vi } from 'vitest';
import { finagoListAccounts } from './accounts';

let mocks = vi.hoisted(() => ({
  client: {
    get: vi.fn(),
    list: vi.fn()
  }
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: () => mocks.client
}));

describe('finago_list_accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the documented account id and keeps the accountId alias', async () => {
    let record = {
      id: 1000001,
      number: 1900,
      name: 'Cash, NOK',
      taxId: 0
    };
    mocks.client.list.mockResolvedValue({ records: [record] });

    let result = await finagoListAccounts.handleInvocation({
      input: { query: 'salary' }
    } as any);

    expect(mocks.client.list).toHaveBeenCalledWith(
      '/accounts',
      { query: 'salary' },
      1,
      'list accounts'
    );
    expect(result.output.accounts).toEqual([
      {
        id: 1000001,
        accountId: 1000001,
        number: 1900,
        name: 'Cash, NOK',
        taxId: 0,
        record
      }
    ]);
    expect(result.output.count).toBe(1);
  });

  it('rejects query when reading one account by id', async () => {
    await expect(
      finagoListAccounts.handleInvocation({
        input: { accountId: 1000001, query: 'salary' }
      } as any)
    ).rejects.toThrow(
      'query is only supported when listing accounts; omit accountId to search accounts.'
    );

    expect(mocks.client.get).not.toHaveBeenCalled();
    expect(mocks.client.list).not.toHaveBeenCalled();
  });
});
