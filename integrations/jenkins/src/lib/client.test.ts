import { describe, expect, it } from 'vitest';
import {
  extractGitScmConfigsFromBuild,
  extractGitScmConfigsFromParsedXml,
  extractGitScmMatchTargetsFromParsedXml,
  extractReplayScriptsFromHtml,
  gitScmMatchTargetMatches,
  gitScmUrlsLooselyMatch,
  JenkinsClient,
  jobFullNameFromInput,
  normalizeJenkinsAuth,
  parseBuildSelectorPath,
  summarizeBuildChangesets
} from './client';

describe('normalizeJenkinsAuth', () => {
  it('normalizes base URL and trims Basic auth credentials', () => {
    expect(
      normalizeJenkinsAuth({
        baseUrl: ' https://jenkins.example.com/controller/?unused=true#fragment ',
        username: ' user ',
        apiToken: ' token '
      })
    ).toEqual({
      baseUrl: 'https://jenkins.example.com/controller',
      username: 'user',
      apiToken: 'token'
    });
  });

  it('rejects blank Basic auth credentials after trimming', () => {
    expect(() =>
      normalizeJenkinsAuth({
        baseUrl: 'https://jenkins.example.com',
        username: '   ',
        apiToken: 'token'
      })
    ).toThrow('username is required.');

    expect(() =>
      normalizeJenkinsAuth({
        baseUrl: 'https://jenkins.example.com',
        username: 'user',
        apiToken: '   '
      })
    ).toThrow('apiToken is required.');
  });
});

describe('JenkinsClient authentication', () => {
  it('sends preemptive HTTP Basic auth with trimmed username and API token', () => {
    let client = new JenkinsClient({
      auth: {
        baseUrl: 'https://jenkins.example.com/',
        username: ' user ',
        apiToken: ' token '
      }
    });
    let axios = (
      client as unknown as {
        axios: {
          defaults: {
            headers: Record<string, unknown>;
          };
        };
      }
    ).axios;

    expect(axios.defaults.headers.Authorization).toBe(
      `Basic ${Buffer.from('user:token', 'utf8').toString('base64')}`
    );
  });
});

describe('parseBuildSelectorPath', () => {
  it('rejects buildNumber with named last-build selectors', () => {
    expect(() => parseBuildSelectorPath('lastSuccessfulBuild', 42)).toThrow(
      'buildNumber can only be used when buildSelector is number or omitted.'
    );
  });

  it('uses buildNumber when selector is omitted or explicit number', () => {
    expect(parseBuildSelectorPath(undefined, 42)).toBe('42');
    expect(parseBuildSelectorPath('number', 42)).toBe('42');
  });
});

describe('jobFullNameFromInput', () => {
  it('rejects missing job input when no default job is configured', () => {
    expect(() => jobFullNameFromInput(undefined, undefined)).toThrow(
      'jobFullName is required. Provide jobFullName input or configure defaultJobFullName.'
    );
  });
});

describe('extractReplayScriptsFromHtml', () => {
  it('extracts Jenkins Replay main script and loaded scripts from the run form', () => {
    let html = `
      <form action="run" method="POST" name="config">
        <div class="jenkins-form-item tr">
          <div class="jenkins-form-label help-sibling">Main Script</div>
          <div class="setting-main">
            <textarea name ="_.mainScript">pipeline { echo &quot;hello &amp; replay&quot; }</textarea>
          </div>
        </div>
        <div class="jenkins-form-item tr">
          <div class="jenkins-form-label help-sibling">org.example.LoadedScript</div>
          <div class="setting-main">
            <textarea name ="_.org_example_LoadedScript">echo &#39;loaded&#39;</textarea>
          </div>
        </div>
      </form>
    `;

    expect(extractReplayScriptsFromHtml(html)).toEqual({
      mainScript: 'pipeline { echo "hello & replay" }',
      loadedScripts: {
        'org.example.LoadedScript': "echo 'loaded'"
      }
    });
  });

  it('ignores rebuild-only Replay pages without script disclosure', () => {
    let html = `
      <form action="rebuild" method="POST" name="rebuild">
        <button type="submit">Run</button>
      </form>
    `;

    expect(extractReplayScriptsFromHtml(html)).toBeUndefined();
  });
});

describe('JenkinsClient replay status handling', () => {
  it('treats SlateError data.status 404 as Pipeline Replay unavailable', async () => {
    let client = new JenkinsClient({
      auth: {
        baseUrl: 'http://jenkins.example',
        username: 'user',
        apiToken: 'token'
      }
    });
    let getCalls = 0;
    (
      client as unknown as {
        axios: {
          get: (path: string) => Promise<{ data: unknown }>;
        };
      }
    ).axios = {
      get: async () => {
        getCalls += 1;
        if (getCalls === 1) {
          return { data: { number: 7 } };
        }

        let error = new Error('Request failed with status code 404') as Error & {
          data: { status: number };
        };
        error.data = { status: 404 };
        throw error;
      }
    };

    await expect(client.getReplayScripts('folder/job', 7)).rejects.toThrow(
      'Pipeline Replay is not available for this build'
    );
  });

  it('rejects rebuild-only Replay pages that do not expose editable scripts', async () => {
    let client = new JenkinsClient({
      auth: {
        baseUrl: 'http://jenkins.example',
        username: 'user',
        apiToken: 'token'
      }
    });
    let getCalls = 0;
    (
      client as unknown as {
        axios: {
          get: (path: string) => Promise<{ data: unknown }>;
        };
      }
    ).axios = {
      get: async () => {
        getCalls += 1;
        if (getCalls === 1) {
          return { data: { number: 7 } };
        }

        return {
          data: `
            <form action="rebuild" method="POST" name="rebuild">
              <button type="submit">Run</button>
            </form>
          `
        };
      }
    };

    await expect(client.getReplayScripts('folder/job', 7)).rejects.toThrow(
      'Pipeline Replay rebuild is available for this build, but Jenkins did not expose editable replay scripts in the response.'
    );
  });
});

describe('JenkinsClient log reads', () => {
  it('caps readLogUntil text to maxLines even when Jenkins returns a larger chunk', async () => {
    let client = new JenkinsClient({
      auth: {
        baseUrl: 'http://jenkins.example',
        username: 'user',
        apiToken: 'token'
      }
    });
    (
      client as unknown as {
        getProgressiveLog: JenkinsClient['getProgressiveLog'];
      }
    ).getProgressiveLog = async () => ({
      text: 'first\nsecond\nthird\n',
      start: 0,
      nextStart: Buffer.byteLength('first\nsecond\nthird\n', 'utf8'),
      moreData: false,
      progressive: true
    });

    let log = await client.readLogUntil({
      jobFullName: 'folder/job',
      buildNumber: 7,
      maxLines: 2
    });

    expect(log.text).toBe('first\nsecond\n');
    expect(log.moreData).toBe(true);
    expect(log.nextStart).toBe(Buffer.byteLength('first\nsecond\n', 'utf8'));
  });

  it('treats a negative limit as a tail window', async () => {
    let client = new JenkinsClient({
      auth: {
        baseUrl: 'http://jenkins.example',
        username: 'user',
        apiToken: 'token'
      }
    });
    client.getBuild = async () => ({ number: 7 });
    client.getProgressiveLog = async () => ({
      text: 'first\nsecond\nthird\n',
      start: 0,
      nextStart: Buffer.byteLength('first\nsecond\nthird\n', 'utf8'),
      moreData: false,
      progressive: true
    });

    let page = await client.getBuildLog({
      jobFullName: 'folder/job',
      buildNumber: 7,
      limit: -2,
      maxLines: 100
    });

    expect(page.lines).toEqual(['second', 'third']);
    expect(page.startLine).toBe(2);
    expect(page.endLine).toBe(3);
  });
});

describe('JenkinsClient SCM search', () => {
  let createClient = () =>
    new JenkinsClient({
      auth: {
        baseUrl: 'http://jenkins.example',
        username: 'user',
        apiToken: 'token'
      }
    });

  let createJobs = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      name: `job-${index + 1}`,
      fullName: `folder/job-${index + 1}`,
      isFolder: false,
      raw: {}
    }));

  let createScmResult = (url = 'https://github.com/example/app.git') => ({
    summary: {
      scmClasses: ['hudson.plugins.git.GitSCM'],
      urls: [url],
      branches: ['*/main'],
      credentialsIds: []
    },
    gitScms: [],
    gitScmMatchTargets: [
      {
        uri: url,
        repositoryName: 'origin',
        branchSpecs: ['*/main']
      }
    ],
    parsedConfig: {}
  });

  it('never exceeds eight concurrent SCM reads and marks an early stop incomplete', async () => {
    let client = createClient();
    let jobs = createJobs(20);
    client.listJobs = async () => jobs;
    let activeRequests = 0;
    let maxActiveRequests = 0;
    let inspectedJobs: string[] = [];
    client.getJobScm = async jobFullName => {
      inspectedJobs.push(jobFullName);
      activeRequests += 1;
      maxActiveRequests = Math.max(maxActiveRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return createScmResult();
    };

    let result = await client.findJobsWithScmUrl({
      scmUrl: 'git@github.com:example/app.git',
      skip: 0,
      limit: 2
    });

    expect(result.matches.map(match => match.job.fullName)).toEqual([
      'folder/job-1',
      'folder/job-2'
    ]);
    expect(maxActiveRequests).toBe(8);
    expect(inspectedJobs).toHaveLength(8);
    expect(result).toMatchObject({
      listedCount: 20,
      inspectedCount: 8,
      skippedCount: 0,
      matchCount: 8,
      searchComplete: false
    });
  });

  it('keeps job order under out-of-order completion and applies nonzero skip pagination', async () => {
    let client = createClient();
    let jobs = createJobs(8);
    client.listJobs = async () => jobs;
    let scmResult = createScmResult();
    let pending = new Map<string, (result: typeof scmResult) => void>();
    client.getJobScm = jobFullName =>
      new Promise(resolve => {
        pending.set(jobFullName, resolve);
      });

    let search = client.findJobsWithScmUrl({
      scmUrl: 'git@github.com:example/app.git',
      skip: 2,
      limit: 3
    });
    while (pending.size < jobs.length) {
      await Promise.resolve();
    }
    for (let job of [...jobs].reverse()) {
      pending.get(job.fullName)?.(scmResult);
    }

    let result = await search;

    expect(result.matches.map(match => match.job.fullName)).toEqual([
      'folder/job-3',
      'folder/job-4',
      'folder/job-5'
    ]);
    expect(result).toMatchObject({
      listedCount: 8,
      inspectedCount: 8,
      skippedCount: 0,
      matchCount: 8,
      searchComplete: true
    });
  });

  it('counts missing names and failed SCM reads as skipped and incomplete', async () => {
    let client = createClient();
    let jobs = [
      ...createJobs(1),
      { name: 'job-2', isFolder: false, raw: {} },
      ...createJobs(3).slice(2)
    ];
    jobs.push({
      name: 'job-4',
      fullName: 'folder/job-4',
      isFolder: false,
      raw: {}
    });
    client.listJobs = async () => jobs;
    client.getJobScm = async jobFullName => {
      if (jobFullName === 'folder/job-3') {
        throw new Error('SCM config unavailable');
      }
      return createScmResult(
        jobFullName === 'folder/job-4' ? 'https://github.com/example/other.git' : undefined
      );
    };

    let result = await client.findJobsWithScmUrl({
      scmUrl: 'git@github.com:example/app.git',
      skip: 0,
      limit: 10
    });

    expect(result.matches.map(match => match.job.fullName)).toEqual(['folder/job-1']);
    expect(result).toMatchObject({
      listedCount: 4,
      inspectedCount: 2,
      skippedCount: 2,
      matchCount: 1,
      searchComplete: false
    });
    expect(result.inspectedCount + result.skippedCount).toBe(result.listedCount);
  });
});

describe('extractGitScmConfigsFromParsedXml', () => {
  it('extracts Jenkins MCP plugin-compatible Git SCM configs from job XML shape', () => {
    let parsed = {
      project: {
        scm: {
          '@_class': 'hudson.plugins.git.GitSCM',
          userRemoteConfigs: {
            'hudson.plugins.git.UserRemoteConfig': [
              {
                url: 'https://github.com/example/app.git'
              },
              {
                url: 'git@github.com:example/tools.git'
              }
            ]
          },
          branches: {
            'hudson.plugins.git.BranchSpec': [
              {
                name: '*/main'
              },
              {
                name: 'release/*'
              }
            ]
          }
        }
      }
    };

    expect(extractGitScmConfigsFromParsedXml(parsed)).toEqual([
      {
        name: 'Git',
        uris: ['https://github.com/example/app.git', 'git@github.com:example/tools.git'],
        branches: ['*/main', 'release/*'],
        commit: null
      }
    ]);
  });
});

describe('gitScmUrlsLooselyMatch', () => {
  it('matches equivalent Git remotes using Jenkins Git plugin loose URL rules', () => {
    expect(
      gitScmUrlsLooselyMatch(
        'https://github.com/example/app',
        'git@ssh.github.com:example/app.git'
      )
    ).toBe(true);
    expect(
      gitScmUrlsLooselyMatch(
        'https://dev.azure.com/org/project/_git/repo',
        'ssh://git@ssh.dev.azure.com/v3/org/project/repo.git'
      )
    ).toBe(true);
    expect(gitScmUrlsLooselyMatch('file:///tmp/example-repo.git', '/tmp/example-repo')).toBe(
      true
    );
    expect(
      gitScmUrlsLooselyMatch('https://github.com/example/app', 'https://github.com/other/app')
    ).toBe(false);
  });
});

describe('extractGitScmMatchTargetsFromParsedXml', () => {
  it('extracts Git remote match targets with repository names and branch specs', () => {
    let parsed = {
      project: {
        scm: {
          '@_class': 'hudson.plugins.git.GitSCM',
          userRemoteConfigs: {
            'hudson.plugins.git.UserRemoteConfig': [
              {
                name: 'upstream',
                url: 'https://github.com/example/app.git'
              }
            ]
          },
          branches: {
            'hudson.plugins.git.BranchSpec': [
              {
                name: 'upstream/main'
              }
            ]
          }
        }
      }
    };

    expect(extractGitScmMatchTargetsFromParsedXml(parsed)).toEqual([
      {
        uri: 'https://github.com/example/app.git',
        repositoryName: 'upstream',
        branchSpecs: ['upstream/main']
      }
    ]);
  });
});

describe('gitScmMatchTargetMatches', () => {
  it('matches repository URLs and Jenkins Git branch specs', () => {
    let target = {
      uri: 'https://github.com/example/app.git',
      repositoryName: 'origin',
      branchSpecs: ['*/main', 'release/*']
    };

    expect(gitScmMatchTargetMatches(target, 'git@github.com:example/app.git', undefined)).toBe(
      true
    );
    expect(gitScmMatchTargetMatches(target, 'git@github.com:example/app', 'main')).toBe(true);
    expect(gitScmMatchTargetMatches(target, 'git@github.com:example/app', 'origin/main')).toBe(
      true
    );
    expect(
      gitScmMatchTargetMatches(target, 'git@github.com:example/app', 'feature/test')
    ).toBe(false);
  });

  it('treats parameterized branch specs as branch matches like Jenkins', () => {
    expect(
      gitScmMatchTargetMatches(
        {
          uri: 'https://github.com/example/app.git',
          repositoryName: 'origin',
          branchSpecs: ['$BRANCH']
        },
        'https://github.com/example/app',
        'feature/test'
      )
    ).toBe(true);
  });
});

describe('extractGitScmConfigsFromBuild', () => {
  it('extracts Jenkins MCP plugin-compatible Git SCM configs from build data', () => {
    let build = {
      actions: [
        {
          _class: 'hudson.model.CauseAction'
        },
        {
          _class: 'hudson.plugins.git.util.BuildData',
          remoteUrls: ['https://github.com/example/app.git'],
          lastBuiltRevision: {
            SHA1: '0123456789abcdef0123456789abcdef01234567',
            branch: [
              {
                name: 'origin/main',
                SHA1: '0123456789abcdef0123456789abcdef01234567'
              }
            ]
          }
        }
      ]
    };

    expect(extractGitScmConfigsFromBuild(build)).toEqual([
      {
        name: 'Git',
        uris: ['https://github.com/example/app.git'],
        branches: ['origin/main'],
        commit: '0123456789abcdef0123456789abcdef01234567'
      }
    ]);
  });

  it('returns an empty list when the build has no Git BuildData action', () => {
    expect(
      extractGitScmConfigsFromBuild({
        actions: [
          {
            _class: 'hudson.model.CauseAction'
          }
        ]
      })
    ).toEqual([]);
  });
});

describe('summarizeBuildChangesets', () => {
  it('extracts Pipeline changeSets arrays', () => {
    let result = summarizeBuildChangesets({
      changeSets: [
        {
          kind: 'git',
          items: [
            {
              commitId: 'abc123',
              msg: 'add pipeline file',
              timestamp: 1710000000000,
              author: { fullName: 'Ada Lovelace' },
              authorEmail: 'ada@example.com',
              affectedPaths: ['Jenkinsfile']
            }
          ]
        }
      ]
    });

    expect(result.changeSets).toHaveLength(1);
    expect(result.changeSets[0]).toMatchObject({
      kind: 'git',
      itemCount: 1
    });
    expect(result.changes).toEqual([
      {
        commitId: 'abc123',
        message: 'add pipeline file',
        timestamp: 1710000000000,
        authorName: 'Ada Lovelace',
        authorEmail: 'ada@example.com',
        affectedPaths: ['Jenkinsfile']
      }
    ]);
  });

  it('extracts freestyle changeSet objects and falls back to Git paths', () => {
    let result = summarizeBuildChangesets({
      changeSet: {
        kind: 'git',
        items: [
          {
            id: 'def456',
            comment: 'update existing file',
            author: { id: 'grace' },
            paths: [{ file: 'src/index.ts' }, { path: 'README.md' }]
          }
        ]
      }
    });

    expect(result.changeSets).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      commitId: 'def456',
      message: 'update existing file',
      authorName: 'grace',
      affectedPaths: ['src/index.ts', 'README.md']
    });
  });
});
