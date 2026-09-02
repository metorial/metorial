import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  loginCheck: vi.fn()
}));

vi.mock('./lib/client', () => ({
  GenesisClient: class {
    loginCheck = mocks.loginCheck;
  }
}));

import { auth } from './auth';

describe('Destatis token auth profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never uses the active output token as identity when input and output differ', async () => {
    let activeToken = 'active-output-token';
    mocks.loginCheck.mockResolvedValueOnce({ username: activeToken });
    let tokenAuth = auth.authStack.find(method => method.key === 'api_token');

    expect(tokenAuth?.getProfile).toBeTypeOf('function');
    let result = await tokenAuth!.getProfile!({
      input: { token: 'stale-input-token' },
      output: { token: activeToken },
      scopes: []
    });

    expect(mocks.loginCheck).toHaveBeenCalledWith('en');
    expect(result.profile.name).toBe('Destatis GENESIS-Online');
    expect(JSON.stringify(result)).not.toContain(activeToken);
  });
});
