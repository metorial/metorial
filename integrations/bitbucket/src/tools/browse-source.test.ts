import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let bitbucketClientMocks = vi.hoisted(() => ({
  getRepository: vi.fn(),
  getSource: vi.fn()
}));

vi.mock('../lib/client', () => ({
  Client: class {
    getRepository(...args: unknown[]) {
      return bitbucketClientMocks.getRepository(...args);
    }

    getSource(...args: unknown[]) {
      return bitbucketClientMocks.getSource(...args);
    }
  }
}));

import { provider } from '../index';

let createBitbucketToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: { workspace: 'acme-workspace' },
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

beforeEach(() => {
  bitbucketClientMocks.getRepository.mockReset();
  bitbucketClientMocks.getSource.mockReset();
  bitbucketClientMocks.getSource.mockResolvedValue('file contents');
});

describe('Bitbucket browse_source revision compatibility', () => {
  it('uses the canonical revision without loading repository metadata', async () => {
    let client = createBitbucketToolTestClient();

    let result = await client.invokeTool('browse_source', {
      repoSlug: 'repo-one',
      revision: 'main',
      path: 'README.md'
    });

    expect(bitbucketClientMocks.getRepository).not.toHaveBeenCalled();
    expect(bitbucketClientMocks.getSource).toHaveBeenCalledWith('repo-one', {
      revision: 'main',
      path: 'README.md'
    });
    expect(result.output).toMatchObject({
      type: 'file',
      path: 'README.md',
      content: 'file contents'
    });
  });

  it('accepts at as a legacy revision alias', async () => {
    let client = createBitbucketToolTestClient();

    await client.invokeTool('browse_source', {
      repoSlug: 'repo-one',
      at: 'release-1',
      path: 'README.md'
    });

    expect(bitbucketClientMocks.getRepository).not.toHaveBeenCalled();
    expect(bitbucketClientMocks.getSource).toHaveBeenCalledWith('repo-one', {
      revision: 'release-1',
      path: 'README.md'
    });
  });

  it('uses the repository main branch when revision is omitted', async () => {
    bitbucketClientMocks.getRepository.mockResolvedValue({
      mainbranch: { name: 'trunk' }
    });
    let client = createBitbucketToolTestClient();

    await client.invokeTool('browse_source', {
      repoSlug: 'repo-one',
      path: 'README.md'
    });

    expect(bitbucketClientMocks.getRepository).toHaveBeenCalledWith('repo-one');
    expect(bitbucketClientMocks.getSource).toHaveBeenCalledWith('repo-one', {
      revision: 'trunk',
      path: 'README.md'
    });
  });

  it('rejects a repository without a main branch before browsing source', async () => {
    bitbucketClientMocks.getRepository.mockResolvedValue({ mainbranch: null });
    let client = createBitbucketToolTestClient();

    await expect(
      client.invokeTool('browse_source', {
        repoSlug: 'empty-repo',
        path: 'README.md'
      })
    ).rejects.toThrow(
      'The repository has no main branch. Provide a branch, tag, or commit hash in revision.'
    );

    expect(bitbucketClientMocks.getSource).not.toHaveBeenCalled();
  });
});
