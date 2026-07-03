import { describe, expect, it } from 'vitest';
import {
  extractGitScmConfigsFromBuild,
  extractGitScmConfigsFromParsedXml,
  extractGitScmMatchTargetsFromParsedXml,
  extractReplayScriptsFromHtml,
  gitScmMatchTargetMatches,
  gitScmUrlsLooselyMatch,
  JenkinsClient,
  summarizeBuildChangesets
} from './client';

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
