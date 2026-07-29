import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubClient } from './lib/client';
import { manageWorkflow } from './tools/manage-workflow';

const context = {
  auth: {
    token: 'test-token',
    instanceUrl: 'https://github.com'
  },
  config: {}
};

const invoke = (input: Record<string, unknown>) =>
  (manageWorkflow as any).handleInvocation({ ...context, input });

const repository = {
  owner: 'octocat',
  repo: 'hello-world'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub Actions analog schema', () => {
  it('is MCP-compatible and exposes every official Actions method additively', () => {
    expectMcpCompatibleToolSchema(manageWorkflow);
    expect(manageWorkflow.scopes).toEqual({ AND: [{ OR: ['repo', 'public_repo'] }] });
    expect(`github-${manageWorkflow.key}`.length).toBeLessThan(60);

    const schema = z.toJSONSchema(manageWorkflow.inputSchema) as any;
    expect(schema.required).toEqual(['owner', 'repo']);
    expect(schema.properties.method.enum).toEqual([
      'list_workflows',
      'list_workflow_runs',
      'list_workflow_jobs',
      'list_workflow_run_artifacts',
      'get_workflow',
      'get_workflow_run',
      'get_workflow_job',
      'download_workflow_run_artifact',
      'get_workflow_run_usage',
      'get_workflow_run_logs_url',
      'run_workflow',
      'rerun_workflow_run',
      'rerun_failed_jobs',
      'cancel_workflow_run',
      'delete_workflow_run_logs'
    ]);
    expect(schema.properties.action.enum).toEqual([
      'list_workflows',
      'list_runs',
      'get_run',
      'trigger',
      'cancel',
      'rerun',
      'list_jobs'
    ]);
    expect(schema.properties.tail_lines.default).toBe(500);
    expect(schema.properties.workflow_jobs_filter.properties.filter.enum).toEqual([
      'latest',
      'all'
    ]);
  });
});

describe('GitHub Actions list analog', () => {
  it('supports every actions_list method with official filters and pagination', async () => {
    const requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce({
        workflows: [{ id: 1, name: 'CI', path: '.github/workflows/ci.yml', state: 'active' }]
      })
      .mockResolvedValueOnce({
        workflow_runs: [
          {
            id: 2,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            head_branch: 'main',
            head_sha: 'abc',
            event: 'push',
            html_url: 'https://github.com/octocat/hello-world/actions/runs/2',
            created_at: '2026-07-29T10:00:00Z',
            updated_at: '2026-07-29T10:01:00Z'
          }
        ]
      })
      .mockResolvedValueOnce({
        jobs: [
          {
            id: 3,
            run_id: 2,
            name: 'test',
            status: 'completed',
            conclusion: 'success'
          }
        ]
      })
      .mockResolvedValueOnce({
        artifacts: [
          {
            id: 4,
            name: 'coverage',
            size_in_bytes: 123,
            expired: false,
            workflow_run: { id: 2 }
          }
        ]
      });

    const workflows = await invoke({
      ...repository,
      method: 'list_workflows',
      page: 2,
      per_page: 50
    });
    const runs = await invoke({
      ...repository,
      method: 'list_workflow_runs',
      resource_id: 'ci.yml',
      workflow_runs_filter: {
        actor: 'hubot',
        branch: 'main',
        event: 'push',
        status: 'completed'
      },
      page: 3,
      per_page: 25
    });
    const jobs = await invoke({
      ...repository,
      method: 'list_workflow_jobs',
      resource_id: '2',
      workflow_jobs_filter: { filter: 'all' },
      page: 4,
      per_page: 10
    });
    const artifacts = await invoke({
      ...repository,
      method: 'list_workflow_run_artifacts',
      resource_id: '2',
      page: 5,
      per_page: 5
    });

    expect(workflows.output.workflows).toEqual([
      expect.objectContaining({ workflowId: 1, name: 'CI' })
    ]);
    expect(runs.output.runs).toEqual([expect.objectContaining({ runId: 2 })]);
    expect(jobs.output.jobs).toEqual([expect.objectContaining({ jobId: 3, runId: 2 })]);
    expect(artifacts.output.artifacts).toEqual([
      expect.objectContaining({ artifactId: 4, runId: 2, byteSize: 123 })
    ]);

    expect(requestRest.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({
        method: 'GET',
        path: '/repos/octocat/hello-world/actions/workflows',
        query: { page: 2, per_page: 50 }
      }),
      expect.objectContaining({
        path: '/repos/octocat/hello-world/actions/workflows/ci.yml/runs',
        query: {
          page: 3,
          per_page: 25,
          actor: 'hubot',
          branch: 'main',
          event: 'push',
          status: 'completed'
        }
      }),
      expect.objectContaining({
        path: '/repos/octocat/hello-world/actions/runs/2/jobs',
        query: { page: 4, per_page: 10, filter: 'all' }
      }),
      expect.objectContaining({
        path: '/repos/octocat/hello-world/actions/runs/2/artifacts',
        query: { page: 5, per_page: 5 }
      })
    ]);
  });

  it('preserves existing list_runs and list_jobs action calls', async () => {
    const requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce({ workflow_runs: [] })
      .mockResolvedValueOnce({ jobs: [] });

    await invoke({
      ...repository,
      action: 'list_runs',
      workflowId: 7,
      branch: 'release',
      perPage: 20
    });
    await invoke({
      ...repository,
      action: 'list_jobs',
      runId: 8,
      perPage: 30
    });

    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/actions/workflows/7/runs',
      query: { per_page: 20, branch: 'release' }
    });
    expect(requestRest.mock.calls[1]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/actions/runs/8/jobs',
      query: { per_page: 30 }
    });
    expect(requestRest.mock.calls[0]?.[0].query).not.toHaveProperty('perPage');
    expect(requestRest.mock.calls[1]?.[0].query).not.toHaveProperty('perPage');
  });
});

describe('GitHub actions_get analog', () => {
  it('gets workflows, runs, jobs, and run usage by exact resource_id', async () => {
    const requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce({
        id: 10,
        name: 'CI',
        path: '.github/workflows/ci.yml',
        state: 'active'
      })
      .mockResolvedValueOnce({
        id: 11,
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        head_branch: 'main',
        head_sha: 'abc',
        event: 'push',
        html_url: 'https://github.com/octocat/hello-world/actions/runs/11',
        created_at: '2026-07-29T10:00:00Z',
        updated_at: '2026-07-29T10:01:00Z'
      })
      .mockResolvedValueOnce({
        id: 12,
        run_id: 11,
        name: 'test',
        status: 'completed',
        conclusion: 'success',
        html_url: 'https://github.com/octocat/hello-world/actions/runs/11/job/12'
      })
      .mockResolvedValueOnce({
        run_duration_ms: 9000,
        billable: {
          UBUNTU: {
            total_ms: 8000,
            jobs: 1,
            job_runs: [{ job_id: 12, duration_ms: 8000 }]
          }
        }
      });

    const workflow = await invoke({
      ...repository,
      method: 'get_workflow',
      resource_id: 'ci.yml'
    });
    const run = await invoke({
      ...repository,
      method: 'get_workflow_run',
      resource_id: '11'
    });
    const job = await invoke({
      ...repository,
      method: 'get_workflow_job',
      resource_id: '12'
    });
    const usage = await invoke({
      ...repository,
      method: 'get_workflow_run_usage',
      resource_id: '11'
    });

    expect(workflow.output.workflow).toMatchObject({ workflowId: 10, name: 'CI' });
    expect(run.output.run).toMatchObject({ runId: 11, headSha: 'abc' });
    expect(job.output.job).toMatchObject({ jobId: 12, runId: 11 });
    expect(usage.output.usage).toEqual({
      runId: 11,
      runDurationMs: 9000,
      billable: [
        {
          operatingSystem: 'UBUNTU',
          totalMs: 8000,
          jobs: 1,
          jobRuns: [{ jobId: 12, durationMs: 8000 }]
        }
      ]
    });
    expect(requestRest.mock.calls.map(call => call[0].path)).toEqual([
      '/repos/octocat/hello-world/actions/workflows/ci.yml',
      '/repos/octocat/hello-world/actions/runs/11',
      '/repos/octocat/hello-world/actions/jobs/12',
      '/repos/octocat/hello-world/actions/runs/11/timing'
    ]);
  });

  it('downloads artifact ZIP bytes only through an attachment', async () => {
    const downloadContent = vi
      .spyOn(GitHubClient.prototype, 'downloadContent')
      .mockResolvedValue({
        bytes: Uint8Array.from([80, 75, 3, 4]),
        byteLength: 4,
        contentType: 'application/octet-stream',
        contentDisposition: 'attachment; filename="coverage.zip"'
      });

    const result = await invoke({
      ...repository,
      method: 'download_workflow_run_artifact',
      resource_id: '42'
    });

    expect(downloadContent).toHaveBeenCalledWith({
      path: '/repos/octocat/hello-world/actions/artifacts/42/zip',
      operation: 'download a GitHub Actions workflow artifact',
      reason: 'github_actions_download_artifact_failed',
      mode: 'binary'
    });
    expect(result.output).toEqual({
      artifactDownload: {
        artifactId: 42,
        fileName: 'coverage.zip',
        mimeType: 'application/zip',
        byteSize: 4
      }
    });
    expect(JSON.stringify(result.output)).not.toMatch(/base64|content/i);
    expect(result.attachments).toEqual([
      {
        mimeType: 'application/zip',
        content: {
          type: 'content',
          encoding: 'base64',
          content: 'UEsDBA=='
        }
      }
    ]);
  });

  it('returns an authenticated workflow-run logs endpoint without downloading content', async () => {
    const downloadContent = vi.spyOn(GitHubClient.prototype, 'downloadContent');

    const result = await invoke({
      ...repository,
      method: 'get_workflow_run_logs_url',
      resource_id: '99'
    });

    expect(result.output).toEqual({
      logsUrl: 'https://api.github.com/repos/octocat/hello-world/actions/runs/99/logs'
    });
    expect(result).not.toHaveProperty('attachments');
    expect(downloadContent).not.toHaveBeenCalled();
  });
});

describe('GitHub actions_run_trigger analog', () => {
  it('supports every official trigger method and preserves legacy trigger calls', async () => {
    const requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValue(undefined);

    await invoke({
      ...repository,
      method: 'run_workflow',
      workflow_id: 'ci.yml',
      ref: 'main',
      inputs: { retries: 2, release: true }
    });
    await invoke({ ...repository, method: 'rerun_workflow_run', run_id: 21 });
    await invoke({ ...repository, method: 'rerun_failed_jobs', run_id: 22 });
    await invoke({ ...repository, method: 'cancel_workflow_run', run_id: 23 });
    await invoke({ ...repository, method: 'delete_workflow_run_logs', run_id: 24 });
    const legacy = await invoke({
      ...repository,
      action: 'trigger',
      workflowId: 25,
      ref: 'release',
      inputs: { environment: 'production' }
    });

    expect(legacy.output).toEqual({ triggered: true });
    expect(requestRest.mock.calls.map(call => call[0])).toEqual([
      expect.objectContaining({
        method: 'POST',
        path: '/repos/octocat/hello-world/actions/workflows/ci.yml/dispatches',
        body: { ref: 'main', inputs: { retries: 2, release: true } }
      }),
      expect.objectContaining({
        method: 'POST',
        path: '/repos/octocat/hello-world/actions/runs/21/rerun'
      }),
      expect.objectContaining({
        method: 'POST',
        path: '/repos/octocat/hello-world/actions/runs/22/rerun-failed-jobs'
      }),
      expect.objectContaining({
        method: 'POST',
        path: '/repos/octocat/hello-world/actions/runs/23/cancel'
      }),
      expect.objectContaining({
        method: 'DELETE',
        path: '/repos/octocat/hello-world/actions/runs/24/logs'
      }),
      expect.objectContaining({
        method: 'POST',
        path: '/repos/octocat/hello-world/actions/workflows/25/dispatches',
        body: { ref: 'release', inputs: { environment: 'production' } }
      })
    ]);
  });

  it('preserves existing list, get, cancel, and rerun action calls', async () => {
    const requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce({ workflows: [] })
      .mockResolvedValueOnce({
        id: 51,
        name: 'CI',
        status: 'in_progress',
        conclusion: null,
        head_branch: 'main',
        head_sha: 'abc',
        event: 'push',
        html_url: 'https://github.com/octocat/hello-world/actions/runs/51',
        created_at: '2026-07-29T10:00:00Z',
        updated_at: '2026-07-29T10:01:00Z'
      })
      .mockResolvedValue(undefined);

    await invoke({ ...repository, action: 'list_workflows' });
    const getRun = await invoke({ ...repository, action: 'get_run', runId: 51 });
    const cancel = await invoke({ ...repository, action: 'cancel', runId: 52 });
    const rerun = await invoke({ ...repository, action: 'rerun', runId: 53 });

    expect(getRun.output.run).toMatchObject({ runId: 51, status: 'in_progress' });
    expect(cancel.output).toEqual({ cancelled: true });
    expect(rerun.output).toEqual({ rerunStarted: true });
    expect(requestRest.mock.calls.map(call => call[0].path)).toEqual([
      '/repos/octocat/hello-world/actions/workflows',
      '/repos/octocat/hello-world/actions/runs/51',
      '/repos/octocat/hello-world/actions/runs/52/cancel',
      '/repos/octocat/hello-world/actions/runs/53/rerun'
    ]);
  });
});

describe('GitHub get_job_logs analog', () => {
  it('returns a single job URL without fetching or exposing log content', async () => {
    const downloadContent = vi.spyOn(GitHubClient.prototype, 'downloadContent');

    const result = await invoke({
      ...repository,
      job_id: 31
    });

    expect(result.output.logFiles).toEqual([
      {
        jobId: 31,
        jobName: null,
        fileName: null,
        mimeType: null,
        byteSize: null,
        totalLines: null,
        returnedLines: null,
        truncated: false,
        downloadUrl: 'https://api.github.com/repos/octocat/hello-world/actions/jobs/31/logs'
      }
    ]);
    expect(JSON.stringify(result.output)).not.toMatch(/logs_content|base64/i);
    expect(result).not.toHaveProperty('attachments');
    expect(downloadContent).not.toHaveBeenCalled();
  });

  it('tails single-job content and returns it only as a text attachment', async () => {
    const downloadContent = vi
      .spyOn(GitHubClient.prototype, 'downloadContent')
      .mockResolvedValue({
        bytes: Uint8Array.from(Buffer.from('one\\ntwo\\nthree\\n')),
        byteLength: 16,
        text: 'one\ntwo\nthree\n',
        contentType: 'text/plain; charset=utf-8',
        contentDisposition: 'attachment; filename="job-31.txt"'
      });

    const result = await invoke({
      ...repository,
      job_id: 31,
      return_content: true,
      tail_lines: 2
    });

    expect(downloadContent).toHaveBeenCalledWith({
      path: '/repos/octocat/hello-world/actions/jobs/31/logs',
      operation: 'download GitHub Actions workflow job logs',
      reason: 'github_actions_download_job_logs_failed',
      mode: 'text'
    });
    expect(result.output.logFiles).toEqual([
      expect.objectContaining({
        jobId: 31,
        fileName: 'job-31.txt',
        mimeType: 'text/plain',
        byteSize: 10,
        totalLines: 3,
        returnedLines: 2,
        truncated: true
      })
    ]);
    expect(JSON.stringify(result.output)).not.toContain('two\nthree');
    expect(result.attachments).toEqual([
      {
        mimeType: 'text/plain',
        content: {
          type: 'content',
          encoding: 'utf-8',
          content: 'two\nthree\n'
        }
      }
    ]);
  });

  it('gets attachments only for failed jobs in failed-only mode', async () => {
    const requestRest = vi.spyOn(GitHubClient.prototype, 'requestRest').mockResolvedValue({
      jobs: [
        { id: 41, name: 'test', status: 'completed', conclusion: 'failure' },
        { id: 42, name: 'lint', status: 'completed', conclusion: 'success' },
        { id: 43, name: 'timeout', status: 'completed', conclusion: 'timed_out' }
      ]
    });
    const downloadContent = vi
      .spyOn(GitHubClient.prototype, 'downloadContent')
      .mockResolvedValue({
        bytes: Uint8Array.from(Buffer.from('setup\nfailed\n')),
        byteLength: 13,
        text: 'setup\nfailed\n',
        contentType: 'text/plain'
      });

    const result = await invoke({
      ...repository,
      run_id: 40,
      failed_only: true,
      return_content: true,
      tail_lines: 1
    });

    expect(requestRest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/repos/octocat/hello-world/actions/runs/40/jobs',
        query: { filter: 'latest', page: 1, per_page: 100 }
      })
    );
    expect(downloadContent).toHaveBeenCalledTimes(1);
    expect(downloadContent).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/repos/octocat/hello-world/actions/jobs/41/logs'
      })
    );
    expect(result.output).toMatchObject({
      totalJobs: 3,
      failedJobs: 1,
      logFiles: [
        {
          jobId: 41,
          jobName: 'test',
          totalLines: 2,
          returnedLines: 1,
          truncated: true
        }
      ]
    });
    expect(JSON.stringify(result.output)).not.toContain('failed\n');
    expect(result.attachments).toEqual([
      {
        mimeType: 'text/plain',
        content: {
          type: 'content',
          encoding: 'utf-8',
          content: 'failed\n'
        }
      }
    ]);
  });

  it('enforces official conditional fields with ServiceError-compatible validation', async () => {
    await expect(invoke({ ...repository, method: 'get_workflow_run' })).rejects.toThrow(
      'resource_id is required'
    );
    await expect(
      invoke({ ...repository, method: 'get_workflow_job', resource_id: 'abc' })
    ).rejects.toThrow('resource_id must be a positive integer');
    await expect(invoke({ ...repository })).rejects.toThrow(
      'job_id must be a positive integer'
    );
    await expect(invoke({ ...repository, failed_only: true, job_id: 1 })).rejects.toThrow(
      'run_id must be a positive integer'
    );
    await expect(
      invoke({
        ...repository,
        action: 'cancel',
        method: 'rerun_workflow_run',
        run_id: 1
      })
    ).rejects.toThrow('select different workflow operations');
    await expect(
      invoke({ ...repository, method: 'run_workflow', ref: 'main' })
    ).rejects.toThrow('workflow_id is required');
  });
});
