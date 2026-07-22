import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  createUserEmailCredentials: vi.fn(),
  getUser: vi.fn(),
  updateUser: vi.fn(),
  updateUserEmailCredentials: vi.fn()
}));

vi.mock('../lib/client', () => ({
  LookerClient: vi.fn(() => clientMocks)
}));

import { manageUser } from './manage-user';

let invocation = (input: Record<string, unknown>) =>
  manageUser.handleInvocation({
    auth: { token: 'test-token' },
    config: { instanceUrl: 'https://example.looker.com' },
    input
  } as never);

describe('manage_user email credentials', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates the user and email credentials through separate endpoints', async () => {
    clientMocks.createUser.mockResolvedValueOnce({ id: 'user-7', first_name: 'Ada' });
    clientMocks.createUserEmailCredentials.mockResolvedValueOnce(undefined);
    clientMocks.getUser.mockResolvedValueOnce({
      id: 'user-7',
      first_name: 'Ada',
      email: 'ada@example.com'
    });

    let result = await invocation({
      action: 'create',
      firstName: 'Ada',
      email: 'ada@example.com',
      forcedPasswordResetAtNextLogin: true
    });

    expect(clientMocks.createUser).toHaveBeenCalledWith({ first_name: 'Ada' });
    expect(clientMocks.createUserEmailCredentials).toHaveBeenCalledWith('user-7', {
      email: 'ada@example.com',
      forced_password_reset_at_next_login: true
    });
    expect(result.output.user).toMatchObject({
      userId: 'user-7',
      email: 'ada@example.com'
    });
  });

  it('can update only email credentials without sending an empty user patch', async () => {
    clientMocks.updateUserEmailCredentials.mockResolvedValueOnce(undefined);
    clientMocks.getUser.mockResolvedValueOnce({
      id: 'user-7',
      email: 'new@example.com'
    });

    await invocation({
      action: 'update',
      userId: 'user-7',
      email: 'new@example.com'
    });

    expect(clientMocks.updateUser).not.toHaveBeenCalled();
    expect(clientMocks.updateUserEmailCredentials).toHaveBeenCalledWith('user-7', {
      email: 'new@example.com'
    });
    expect(clientMocks.getUser).toHaveBeenCalledWith('user-7');
  });
});
