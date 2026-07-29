import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import { GitHubClient } from './lib/client';

let setHttp = (client: GitHubClient, http: Record<string, unknown>) => {
  (client as unknown as { http: Record<string, unknown> }).http = http;
};

let captureError = async (run: () => Promise<unknown>) => {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('Expected operation to fail.');
};

describe('GitHub client shared request foundation', () => {
  it('maps typed REST method, query, body, and headers and returns response data', async () => {
    let request = vi.fn().mockResolvedValue({
      data: { id: 42, state: 'updated' }
    });
    let client = new GitHubClient({ token: 'test-token' });
    setHttp(client, { request });

    let result = await client.requestRest<{ id: number; state: string }>({
      method: 'PATCH',
      path: '/repos/octocat/hello-world/labels/bug',
      operation: 'update label',
      reason: 'github_update_label_failed',
      query: { notify: false },
      body: { color: 'ff0000' },
      headers: { Accept: 'application/vnd.github+json' }
    });

    expect(request).toHaveBeenCalledWith({
      method: 'PATCH',
      url: '/repos/octocat/hello-world/labels/bug',
      params: { notify: false },
      data: { color: 'ff0000' },
      headers: { Accept: 'application/vnd.github+json' }
    });
    expect(result).toEqual({ id: 42, state: 'updated' });
  });

  it('wraps REST transport failures as ServiceError instances', async () => {
    let request = vi.fn().mockRejectedValue(
      Object.assign(new Error('Forbidden'), {
        response: {
          status: 403,
          data: { message: 'Resource not accessible by integration' }
        }
      })
    );
    let client = new GitHubClient({ token: 'test-token' });
    setHttp(client, { request });

    let error = await captureError(() =>
      client.requestRest({
        method: 'GET',
        path: '/repos/octocat/hello-world/security/alerts',
        operation: 'list security alerts',
        reason: 'github_list_security_alerts_failed'
      })
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain('Resource not accessible by integration');
  });

  it('maps GraphQL documents, variables, and feature headers for queries and mutations', async () => {
    let post = vi.fn().mockResolvedValue({
      data: {
        data: {
          addDiscussionComment: {
            comment: { id: 'DC_kwDO123' }
          }
        }
      }
    });
    let client = new GitHubClient({ token: 'test-token' });
    setHttp(client, { post });
    let mutation = 'mutation AddComment($input: AddDiscussionCommentInput!) { add }';
    let variables = { input: { discussionId: 'D_kwDO123', body: 'Hello' } };

    let result = await client.requestGraphQL<{
      addDiscussionComment: { comment: { id: string } };
    }>(mutation, variables, ['discussions_api']);

    expect(post).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      { query: mutation, variables },
      { headers: { 'GraphQL-Features': 'discussions_api' } }
    );
    expect(result.addDiscussionComment.comment.id).toBe('DC_kwDO123');
  });

  it('normalizes GraphQL payload errors as ServiceError instances', async () => {
    let post = vi.fn().mockResolvedValue({
      data: {
        errors: [{ message: 'Project access denied' }]
      }
    });
    let client = new GitHubClient({ token: 'test-token' });
    setHttp(client, { post });

    let error = await captureError(() =>
      client.requestGraphQL('query Project { viewer { login } }', {})
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain(
      'GitHub GraphQL request failed: Project access denied'
    );
  });

  it('returns text and binary download bytes with response metadata', async () => {
    let get = vi
      .fn()
      .mockResolvedValueOnce({
        data: 'first line\nsecond line\n',
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'content-disposition': 'attachment; filename="job.log"'
        }
      })
      .mockResolvedValueOnce({
        data: Uint8Array.from([0, 1, 254, 255]),
        headers: {
          'content-type': 'application/zip',
          'content-disposition': 'attachment; filename="artifact.zip"'
        }
      });
    let client = new GitHubClient({ token: 'test-token' });
    setHttp(client, { get });

    let text = await client.downloadContent({
      path: 'https://pipelines.actions.githubusercontent.com/job-log',
      operation: 'download workflow job log',
      reason: 'github_download_job_log_failed',
      mode: 'text'
    });
    let binary = await client.downloadContent({
      path: 'https://pipelines.actions.githubusercontent.com/artifact',
      operation: 'download workflow artifact',
      reason: 'github_download_workflow_artifact_failed'
    });

    expect(get).toHaveBeenNthCalledWith(1, expect.any(String), {
      params: undefined,
      headers: undefined,
      responseType: 'text',
      maxRedirects: 5
    });
    expect(get).toHaveBeenNthCalledWith(2, expect.any(String), {
      params: undefined,
      headers: undefined,
      responseType: 'arraybuffer',
      maxRedirects: 5
    });
    expect(text).toMatchObject({
      byteLength: 23,
      text: 'first line\nsecond line\n',
      contentType: 'text/plain; charset=utf-8',
      contentDisposition: 'attachment; filename="job.log"'
    });
    expect(Array.from(text.bytes)).toEqual(
      Array.from(new TextEncoder().encode('first line\nsecond line\n'))
    );
    expect(binary).toMatchObject({
      byteLength: 4,
      contentType: 'application/zip',
      contentDisposition: 'attachment; filename="artifact.zip"'
    });
    expect(binary).not.toHaveProperty('text');
    expect(Array.from(binary.bytes)).toEqual([0, 1, 254, 255]);
  });
});
