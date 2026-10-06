import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { createPullRequestReview, downloadFile, getFileContent, searchRepos } from './tools';

describeMcpCompatibleToolSchemas('Gitea tool input schemas', provider.actions);
it('preserves legacy file reading and registers downloadable file replacement', () => {
  expect(provider.actions).toContain(getFileContent);
  expect(provider.actions).toContain(downloadFile);
  expect(getFileContent.key).toBe('get_file_content');
  expect(getFileContent.tags).toMatchObject({ deprecated: true });
  expect(
    getFileContent.description?.startsWith('DEPRECATED — use `download_file` instead.')
  ).toBe(true);
});

it('preserves numeric field types and accepts zero for the unused review side', () => {
  for (const tool of provider.actions) {
    if (tool.key !== 'delete_team')
      expect(JSON.stringify(z.toJSONSchema(tool.inputSchema)), tool.key).not.toContain(
        '"type":"integer"'
      );
    expect(JSON.stringify(z.toJSONSchema(tool.outputSchema)), tool.key).not.toContain(
      '"type":"integer"'
    );
  }
  expect(searchRepos.inputSchema.safeParse({ page: 1, limit: 0 }).success).toBe(true);
  expect(searchRepos.inputSchema.safeParse({ page: 1.5 }).success).toBe(false);
  expect(
    searchRepos.inputSchema.safeParse({ limit: Number.MAX_SAFE_INTEGER + 1 }).success
  ).toBe(false);
  expect(
    createPullRequestReview.inputSchema.safeParse({
      owner: 'test-owner',
      repo: 'test-repo',
      prNumber: 1,
      event: 'COMMENT',
      comments: [{ path: 'proof.txt', body: 'Review proof', newPosition: 1, oldPosition: 0 }]
    }).success
  ).toBe(true);
});
