import { describe, expect, it, vi } from 'vitest';
import { duplicationFilesFromShowResponse } from '../tools/source';
import {
  cloudV1BaseUrl,
  cloudV2BaseUrl,
  componentTreeMeasuresParams,
  dependencyRiskParams,
  duplicationShowParams,
  hotspotProjectSearchParams,
  issueSearchParams,
  isVersionAtLeast,
  metricsSearchParams,
  normalizePage,
  normalizeServerBaseUrl,
  optionalCloudOrganization,
  optionalPageSizeIncludingAll,
  pageNumber,
  pageSize,
  projectKeyFor,
  projectMeasuresParams,
  projectSearchParams,
  requireCloudOrganization,
  requireOneProjectStatusIdentifier,
  requireServerDeployment,
  resolveV2BaseUrl,
  ruleShowParams,
  SonarQubeClient,
  serializeSonarParams,
  sourceRawParams,
  sourceScmParams,
  validateAuthenticationResponse,
  validateQualityGateStatusParams
} from './client';

describe('SonarQube client helpers', () => {
  it('normalizes SonarQube Server base URLs to the v1 API root', () => {
    expect(normalizeServerBaseUrl('https://sonarqube.example.com')).toBe(
      'https://sonarqube.example.com/api'
    );
    expect(normalizeServerBaseUrl('https://sonarqube.example.com/sonar/')).toBe(
      'https://sonarqube.example.com/sonar/api'
    );
    expect(normalizeServerBaseUrl('https://sonarqube.example.com/api')).toBe(
      'https://sonarqube.example.com/api'
    );
  });

  it('rejects missing or invalid SonarQube Server URLs', () => {
    expect(() => normalizeServerBaseUrl(undefined)).toThrow(/serverBaseUrl/);
    expect(() => normalizeServerBaseUrl('not a url')).toThrow(/valid URL/);
    expect(() => normalizeServerBaseUrl('ftp://sonarqube.example.com')).toThrow(/http/);
  });

  it('resolves Cloud v1 and isolated v2 base URLs by region', () => {
    expect(cloudV1BaseUrl('eu')).toBe('https://sonarcloud.io/api');
    expect(cloudV1BaseUrl('us')).toBe('https://sonarqube.us/api');
    expect(cloudV2BaseUrl('eu')).toBe('https://api.sonarcloud.io');
    expect(cloudV2BaseUrl('us')).toBe('https://api.sonarqube.us');
    expect(resolveV2BaseUrl({ deployment: 'cloud', cloudRegion: 'us' })).toBe(
      'https://api.sonarqube.us'
    );
    expect(
      resolveV2BaseUrl({
        deployment: 'server',
        serverBaseUrl: 'https://sonarqube.example.com'
      })
    ).toBe('https://sonarqube.example.com/api');
  });

  it('serializes Sonar parameters using comma-separated arrays and omits empty values', () => {
    expect(
      serializeSonarParams({
        metricKeys: ['ncloc', 'coverage'],
        page: 2,
        resolved: false,
        empty: '',
        missing: undefined,
        blankArray: []
      })
    ).toBe('metricKeys=ncloc%2Ccoverage&page=2&resolved=false');
  });

  it('serializes form-compatible Sonar values', () => {
    expect(
      serializeSonarParams({
        issue: 'ISSUE-1',
        transition: 'accept',
        tags: ['security', 'triaged'],
        comment: 'Reviewed',
        empty: undefined
      })
    ).toBe('issue=ISSUE-1&transition=accept&tags=security%2Ctriaged&comment=Reviewed');
  });

  it('validates and caps pagination values', () => {
    expect(pageNumber(undefined)).toBe(1);
    expect(pageNumber(2.9)).toBe(2);
    expect(pageSize(undefined, 50, 500)).toBe(50);
    expect(pageSize(999, 50, 500)).toBe(500);
    expect(optionalPageSizeIncludingAll(undefined)).toBeUndefined();
    expect(optionalPageSizeIncludingAll(0)).toBe(0);
    expect(optionalPageSizeIncludingAll(2.9)).toBe(2);
    expect(() => pageNumber(0)).toThrow(/page/);
    expect(() => pageSize(0, 50, 500)).toThrow(/pageSize/);
    expect(() => optionalPageSizeIncludingAll(-1)).toThrow(/pageSize/);
  });

  it('enforces Cloud organization requirements only for Cloud configs', () => {
    expect(requireCloudOrganization({ deployment: 'server' }, undefined)).toBeUndefined();
    expect(
      requireCloudOrganization(
        { deployment: 'server', organization: 'ignored' },
        'also-ignored'
      )
    ).toBeUndefined();
    expect(
      requireCloudOrganization({ deployment: 'cloud', organization: 'acme' }, undefined)
    ).toBe('acme');
    expect(requireCloudOrganization({ deployment: 'cloud' }, 'override')).toBe('override');
    expect(() => requireCloudOrganization({ deployment: 'cloud' }, undefined)).toThrow(
      /organization/
    );
  });

  it('resolves optional Cloud organization params only for Cloud configs', () => {
    expect(
      optionalCloudOrganization({ deployment: 'server', organization: 'acme' }, undefined)
    ).toBeUndefined();
    expect(
      optionalCloudOrganization({ deployment: 'cloud', organization: 'acme' }, undefined)
    ).toBe('acme');
    expect(optionalCloudOrganization({ deployment: 'cloud' }, 'override')).toBe('override');
    expect(optionalCloudOrganization({ deployment: 'cloud' }, undefined)).toBeUndefined();
  });

  it('normalizes both current and legacy Sonar paging shapes', () => {
    expect(
      normalizePage({
        paging: {
          pageIndex: 2,
          pageSize: 20,
          total: 50
        }
      })
    ).toEqual({
      page: 2,
      pageSize: 20,
      total: 50,
      hasNextPage: true
    });
    expect(
      normalizePage({
        p: 1,
        ps: 3,
        total: 4
      })
    ).toEqual({
      page: 1,
      pageSize: 3,
      total: 4,
      hasNextPage: true
    });
  });

  it('uses default project keys and validates status identifiers', () => {
    expect(projectKeyFor({ defaultProjectKey: 'app' }, undefined)).toBe('app');
    expect(projectKeyFor({}, 'input')).toBe('input');
    expect(() => projectKeyFor({}, undefined)).toThrow(/projectKey/);

    expect(() => requireOneProjectStatusIdentifier({ projectKey: 'app' })).not.toThrow();
    expect(() =>
      requireOneProjectStatusIdentifier({ projectKey: 'app', analysisId: 'analysis' })
    ).not.toThrow();
    expect(() => requireOneProjectStatusIdentifier({})).toThrow(/at least one/);
  });

  it('validates quality gate status branch and pull request combinations', () => {
    expect(() =>
      validateQualityGateStatusParams({ projectKey: 'app', branch: 'main' })
    ).not.toThrow();
    expect(() =>
      validateQualityGateStatusParams({ projectKey: 'app', pullRequest: '42' })
    ).not.toThrow();
    expect(() =>
      validateQualityGateStatusParams({
        projectKey: 'app',
        branch: 'main',
        pullRequest: '42'
      })
    ).toThrow(/'branch' and 'pullRequest' together/);
    expect(() =>
      validateQualityGateStatusParams({ projectId: 'uuid', branch: 'main' })
    ).toThrow(/projectId/);
    expect(() =>
      validateQualityGateStatusParams({ analysisId: 'analysis', pullRequest: '42' })
    ).not.toThrow();
    expect(() =>
      validateQualityGateStatusParams({
        analysisId: 'analysis',
        projectKey: 'app',
        branch: 'main'
      })
    ).not.toThrow();
  });

  it('rejects Server-only operations for SonarQube Cloud configs', () => {
    expect(() =>
      requireServerDeployment({ deployment: 'server' }, 'get system status')
    ).not.toThrow();
    expect(() =>
      requireServerDeployment({ deployment: 'cloud' }, 'get system status')
    ).toThrow(/Server/);
  });

  it('validates authentication responses', () => {
    expect(() => validateAuthenticationResponse({ valid: true })).not.toThrow();
    expect(() => validateAuthenticationResponse({ valid: false })).toThrow(
      /validation failed/
    );
    expect(() => validateAuthenticationResponse({})).toThrow(/validation failed/);
  });

  it('requests only documented metrics search pagination parameters', () => {
    expect(metricsSearchParams({ page: 2, pageSize: 10 })).toEqual({
      p: 2,
      ps: 10
    });
  });

  it('requests metric metadata for project measures across deployments', () => {
    expect(
      projectMeasuresParams(
        { deployment: 'server' },
        {
          projectKey: 'app',
          metricKeys: ['ncloc', 'coverage'],
          branch: 'main'
        }
      )
    ).toEqual({
      component: 'app',
      metricKeys: ['ncloc', 'coverage'],
      branch: 'main',
      pullRequest: undefined,
      additionalFields: 'metrics'
    });

    expect(
      projectMeasuresParams(
        { deployment: 'cloud' },
        {
          projectKey: 'app',
          metricKeys: ['ncloc']
        }
      )
    ).toEqual({
      component: 'app',
      metricKeys: ['ncloc'],
      branch: undefined,
      pullRequest: undefined,
      additionalFields: 'metrics'
    });

    expect(
      projectMeasuresParams(
        { deployment: 'server' },
        {
          projectKey: 'app'
        }
      )
    ).toEqual({
      component: 'app',
      metricKeys: undefined,
      branch: undefined,
      pullRequest: undefined,
      additionalFields: 'metrics'
    });
  });

  it('serializes documented source and duplication parameters by deployment', () => {
    expect(
      sourceRawParams(
        { deployment: 'cloud' },
        {
          component: 'app:src/main.ts',
          branch: 'feature/example'
        }
      )
    ).toEqual({
      key: 'app:src/main.ts',
      branch: 'feature/example',
      pullRequest: undefined
    });

    expect(
      sourceRawParams(
        { deployment: 'server' },
        {
          component: 'app:src/main.ts'
        }
      )
    ).toEqual({
      key: 'app:src/main.ts',
      branch: undefined,
      pullRequest: undefined
    });

    expect(
      sourceRawParams(
        { deployment: 'server' },
        {
          component: 'app:src/main.ts',
          branch: 'feature/example'
        }
      )
    ).toEqual({
      key: 'app:src/main.ts',
      branch: 'feature/example',
      pullRequest: undefined
    });

    expect(
      sourceScmParams({
        component: 'app:src/main.ts',
        fromLine: 1,
        toLine: 3,
        commitsByLine: true
      })
    ).toEqual({
      key: 'app:src/main.ts',
      from: 1,
      to: 3,
      commits_by_line: true
    });

    expect(
      duplicationShowParams(
        { deployment: 'cloud' },
        {
          component: 'app:src/main.ts',
          pullRequest: '42'
        }
      )
    ).toEqual({
      key: 'app:src/main.ts',
      branch: undefined,
      pullRequest: '42'
    });

    expect(
      duplicationShowParams(
        { deployment: 'server' },
        {
          component: 'app:src/main.ts'
        }
      )
    ).toEqual({
      key: 'app:src/main.ts',
      branch: undefined,
      pullRequest: undefined
    });

    expect(
      duplicationShowParams(
        { deployment: 'server' },
        {
          component: 'app:src/main.ts',
          pullRequest: '42'
        }
      )
    ).toEqual({
      key: 'app:src/main.ts',
      branch: undefined,
      pullRequest: '42'
    });

    expect(() =>
      duplicationShowParams(
        { deployment: 'cloud' },
        {
          component: 'app:src/main.ts',
          branch: 'feature/example',
          pullRequest: '42'
        }
      )
    ).toThrow(/'branch' and 'pullRequest' together/);
  });

  it('normalizes documented duplication file maps', () => {
    expect(
      duplicationFilesFromShowResponse({
        files: {
          '1': {
            key: 'app:src/main.ts',
            name: 'main.ts'
          }
        }
      })
    ).toEqual({
      '1': {
        key: 'app:src/main.ts',
        name: 'main.ts'
      }
    });

    expect(duplicationFilesFromShowResponse({ files: [] })).toEqual({});
  });

  it('uses deployment-specific hotspot project parameters', () => {
    expect(hotspotProjectSearchParams({ deployment: 'cloud' }, 'app')).toEqual({
      projectKey: 'app'
    });
    expect(hotspotProjectSearchParams({ deployment: 'server' }, 'app')).toEqual({
      projectKey: 'app'
    });
    expect(
      serializeSonarParams(hotspotProjectSearchParams({ deployment: 'server' }, 'app'))
    ).toBe('projectKey=app');
  });

  it('serializes component search parameters for project discovery', () => {
    expect(
      serializeSonarParams(
        projectSearchParams(
          { deployment: 'cloud', organization: 'acme' },
          {
            query: ' api ',
            qualifiers: ['APP']
          }
        )
      )
    ).toBe('organization=acme&q=api&p=1&ps=500');

    expect(
      serializeSonarParams(
        projectSearchParams(
          { deployment: 'server', organization: 'ignored-config' },
          {
            organization: 'ignored-input',
            query: 'api',
            qualifiers: ['TRK', 'APP'],
            page: 2,
            pageSize: 25
          }
        )
      )
    ).toBe('q=api&qualifiers=TRK%2CAPP&p=2&ps=25');
    expect(serializeSonarParams(projectSearchParams({ deployment: 'server' }, {}))).toBe(
      'qualifiers=TRK&p=1&ps=500'
    );
  });

  it('uses the SonarQube Cloud project discovery endpoint for query search', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'cloud', organization: 'tractivecloud' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path !== '/components/search') {
          throw new Error(`Unexpected request ${path}`);
        }

        return {
          paging: {
            pageIndex: 1,
            pageSize: 50,
            total: 1
          },
          components: [
            {
              key: 'tractivecloud_tracker-application',
              name: 'Tracker Application'
            }
          ]
        };
      }
    );

    await expect(
      client.searchProjects({
        query: 'tracker',
        pageSize: 50
      })
    ).resolves.toEqual({
      items: [
        {
          key: 'tractivecloud_tracker-application',
          name: 'Tracker Application'
        }
      ],
      page: {
        page: 1,
        pageSize: 50,
        total: 1,
        hasNextPage: false
      }
    });
    expect(requests).toEqual([
      {
        path: '/components/search',
        params: {
          organization: 'tractivecloud',
          q: 'tracker',
          p: 1,
          ps: 50
        }
      }
    ]);
  });

  it('uses the components search endpoint for SonarQube Server project discovery', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path !== '/components/search') {
          throw new Error(`Unexpected request ${path}`);
        }

        return {
          paging: {
            pageIndex: 1,
            pageSize: 500,
            total: 1
          },
          components: [
            {
              key: 'app',
              name: 'App',
              qualifier: 'TRK'
            }
          ]
        };
      }
    );

    await expect(client.searchProjects({ query: 'app' })).resolves.toEqual({
      items: [
        {
          key: 'app',
          name: 'App',
          qualifier: 'TRK'
        }
      ],
      page: {
        page: 1,
        pageSize: 500,
        total: 1,
        hasNextPage: false
      }
    });
    expect(requests).toEqual([
      {
        path: '/components/search',
        params: {
          organization: undefined,
          q: 'app',
          qualifiers: ['TRK'],
          p: 1,
          ps: 500
        }
      }
    ]);
  });

  it('serializes current issue search filters for SonarQube issues search', () => {
    expect(
      serializeSonarParams(
        issueSearchParams(
          { deployment: 'cloud', organization: 'acme' },
          {
            projectKeys: ['app'],
            issueStatuses: ['OPEN', 'ACCEPTED'],
            impactSoftwareQualities: ['SECURITY'],
            impactSeverities: ['HIGH'],
            types: ['VULNERABILITY'],
            page: 2,
            pageSize: 25
          }
        )
      )
    ).toBe(
      'organization=acme&componentKeys=app&issueStatuses=OPEN%2CACCEPTED&impactSoftwareQualities=SECURITY&impactSeverities=HIGH&types=VULNERABILITY&p=2&ps=25'
    );

    expect(
      serializeSonarParams(
        issueSearchParams(
          { deployment: 'server', organization: 'ignored-config' },
          {
            organization: 'ignored-input',
            projectKeys: ['app'],
            componentKeys: ['app:src/main.ts'],
            files: ['app:src/extra.ts'],
            issueStatuses: ['OPEN'],
            pageSize: 10
          }
        )
      )
    ).toBe(
      'components=app%2Capp%3Asrc%2Fmain.ts%2Capp%3Asrc%2Fextra.ts&issueStatuses=OPEN&p=1&ps=10'
    );

    expect(
      serializeSonarParams(
        issueSearchParams(
          { deployment: 'server' },
          {
            severities: ['HIGH', 'BLOCKER']
          }
        )
      )
    ).toBe('impactSeverities=HIGH%2CBLOCKER&p=1&ps=100');

    expect(
      serializeSonarParams(
        issueSearchParams(
          { deployment: 'server' },
          {
            severities: ['CRITICAL', 'MAJOR']
          }
        )
      )
    ).toBe('severities=CRITICAL%2CMAJOR&p=1&ps=100');

    expect(() =>
      issueSearchParams(
        { deployment: 'server' },
        {
          severities: ['HIGH', 'MAJOR']
        }
      )
    ).toThrow(/Do not mix/);

    expect(() =>
      issueSearchParams(
        { deployment: 'server' },
        {
          branch: 'main',
          pullRequest: '42'
        }
      )
    ).toThrow(/'branch' and 'pullRequest' together/);

    expect(() =>
      projectMeasuresParams(
        { deployment: 'server' },
        {
          projectKey: 'app',
          metricKeys: ['ncloc'],
          branch: 'main',
          pullRequest: '42'
        }
      )
    ).toThrow(/'branch' and 'pullRequest' together/);
  });

  it('serializes component tree measures parameters for duplicated file search', () => {
    expect(
      serializeSonarParams(
        componentTreeMeasuresParams({
          component: 'app',
          branch: 'main',
          metricKeys: ['duplicated_lines'],
          qualifiers: ['FIL'],
          strategy: 'leaves'
        })
      )
    ).toBe(
      'component=app&branch=main&metricKeys=duplicated_lines&qualifiers=FIL&strategy=leaves&p=1&ps=500'
    );

    expect(() =>
      componentTreeMeasuresParams({
        component: 'app',
        branch: 'main',
        pullRequest: '42',
        metricKeys: ['duplicated_lines']
      })
    ).toThrow(/'branch' and 'pullRequest' together/);
  });

  it('serializes documented dependency risk parameters', () => {
    expect(
      dependencyRiskParams({
        projectKey: 'app',
        branch: 'main',
        pageIndex: 2.9,
        pageSize: 25.8
      })
    ).toEqual({
      projectKey: 'app',
      branchKey: 'main',
      pullRequestKey: undefined,
      pageIndex: 2,
      pageSize: 25
    });

    expect(() =>
      dependencyRiskParams({
        projectKey: 'app',
        branch: 'main',
        pullRequest: '42'
      })
    ).toThrow(/'branch' and 'pullRequest' together/);
    expect(() => dependencyRiskParams({ projectKey: 'app', pageIndex: 0 })).toThrow(
      /pageIndex/
    );
    expect(() => dependencyRiskParams({ projectKey: 'app', pageSize: 501 })).toThrow(
      /pageSize/
    );
  });

  it('checks SonarQube Server dependency risk minimum versions', () => {
    expect(isVersionAtLeast('2025.4.0.1234', '2025.4')).toBe(true);
    expect(isVersionAtLeast('2026.1', '2025.4')).toBe(true);
    expect(isVersionAtLeast('2025.3.9', '2025.4')).toBe(false);
    expect(isVersionAtLeast('10.8.1', '2025.4')).toBe(false);
  });

  it('filters project branches to branch-parameter-compatible entries', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        expect(path).toBe('/project_branches/list');
        expect(params).toEqual({ project: 'app' });
        return {
          branches: [
            {
              name: 'main',
              type: 'LONG'
            },
            {
              name: 'feature',
              type: 'SHORT'
            },
            {
              name: 'develop',
              type: 'BRANCH'
            }
          ]
        };
      }
    );

    await expect(client.listProjectBranches('app')).resolves.toEqual({
      items: [
        {
          name: 'main',
          type: 'LONG'
        },
        {
          name: 'develop',
          type: 'BRANCH'
        }
      ],
      page: undefined
    });
  });

  it('sends documented hotspot search project, key, and leak-period parameters', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {
          paging: {
            pageIndex: 1,
            pageSize: 10,
            total: 0
          },
          hotspots: []
        };
      }
    );

    await expect(
      client.searchHotspots({
        projectKey: 'app',
        branch: 'main',
        hotspotKeys: ['hotspot-1', 'hotspot-2'],
        sinceLeakPeriod: true,
        pageSize: 10
      })
    ).resolves.toEqual({
      items: [],
      page: {
        page: 1,
        pageSize: 10,
        total: 0,
        hasNextPage: false
      }
    });
    expect(requests).toEqual([
      {
        path: '/hotspots/search',
        params: {
          projectKey: 'app',
          branch: 'main',
          pullRequest: undefined,
          hotspots: ['hotspot-1', 'hotspot-2'],
          files: undefined,
          status: undefined,
          resolution: undefined,
          sinceLeakPeriod: true,
          onlyMine: undefined,
          p: 1,
          ps: 10
        }
      }
    ]);
  });

  it('allows hotspot search by hotspot keys without a project key', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {
          paging: {
            pageIndex: 1,
            pageSize: 100,
            total: 1
          },
          hotspots: [{ key: 'hotspot-1' }]
        };
      }
    );

    await expect(
      client.searchHotspots({
        hotspotKeys: ['hotspot-1']
      })
    ).resolves.toMatchObject({
      items: [{ key: 'hotspot-1' }],
      page: {
        page: 1,
        pageSize: 100,
        total: 1,
        hasNextPage: false
      }
    });
    expect(requests).toEqual([
      {
        path: '/hotspots/search',
        params: {
          projectKey: undefined,
          branch: undefined,
          pullRequest: undefined,
          hotspots: ['hotspot-1'],
          files: undefined,
          status: undefined,
          resolution: undefined,
          sinceLeakPeriod: undefined,
          onlyMine: undefined,
          p: 1,
          ps: 100
        }
      }
    ]);

    await expect(client.searchHotspots({})).rejects.toThrow(/projectKey/);
  });

  it('lists project pull requests from the documented endpoint', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {
          pullRequests: [
            {
              key: '42',
              title: 'Add feature',
              branch: 'feature/example'
            }
          ]
        };
      }
    );

    await expect(client.listProjectPullRequests('app')).resolves.toMatchObject({
      items: [{ key: '42', title: 'Add feature', branch: 'feature/example' }]
    });
    expect(requests).toEqual([
      {
        path: '/project_pull_requests/list',
        params: { project: 'app' }
      }
    ]);
  });

  it('fetches security hotspot details from the documented endpoint', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {
          key: 'hotspot-1',
          status: 'TO_REVIEW'
        };
      }
    );

    await expect(client.getHotspot('hotspot-1')).resolves.toEqual({
      key: 'hotspot-1',
      status: 'TO_REVIEW'
    });
    expect(requests).toEqual([
      {
        path: '/hotspots/show',
        params: { hotspot: 'hotspot-1' }
      }
    ]);
  });

  it('posts issue transitions with the documented form parameters', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { post: unknown }).post = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {};
      }
    );

    await expect(
      client.changeIssueStatus({ issueKey: 'ISSUE-1', transition: 'accept' })
    ).resolves.toEqual({});
    expect(requests).toEqual([
      {
        path: '/issues/do_transition',
        params: {
          issue: 'ISSUE-1',
          transition: 'accept'
        }
      }
    ]);
  });

  it('posts security hotspot status changes with the documented form parameters', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { post: unknown }).post = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {};
      }
    );

    await expect(
      client.changeHotspotStatus({
        hotspotKey: 'hotspot-1',
        status: 'REVIEWED',
        resolution: 'SAFE',
        comment: 'Reviewed and safe'
      })
    ).resolves.toEqual({});
    expect(requests).toEqual([
      {
        path: '/hotspots/change_status',
        params: {
          hotspot: 'hotspot-1',
          status: 'REVIEWED',
          resolution: 'SAFE',
          comment: 'Reviewed and safe'
        }
      }
    ]);
  });

  it('searches files by coverage with the official component tree sorting', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path === '/measures/component') {
          return {
            component: {
              key: 'app',
              measures: [{ metric: 'coverage', value: '55.5' }]
            }
          };
        }

        return {
          paging: {
            pageIndex: 1,
            pageSize: 100,
            total: 1
          },
          components: [
            {
              key: 'app:src/main.ts',
              path: 'src/main.ts',
              measures: [{ metric: 'coverage', value: '10.0' }]
            }
          ]
        };
      }
    );

    await expect(
      client.searchFilesByCoverage({ projectKey: 'app', pageSize: 1000 })
    ).resolves.toMatchObject({
      items: [{ key: 'app:src/main.ts' }],
      pageIndex: 1,
      pageSize: 500
    });
    expect(requests).toEqual([
      {
        path: '/measures/component',
        params: {
          component: 'app',
          metricKeys: ['coverage', 'lines_to_cover', 'uncovered_lines'],
          branch: undefined,
          pullRequest: undefined,
          additionalFields: 'metrics'
        }
      },
      {
        path: '/measures/component_tree',
        params: {
          component: 'app',
          branch: undefined,
          pullRequest: undefined,
          metricKeys: [
            'coverage',
            'line_coverage',
            'branch_coverage',
            'lines_to_cover',
            'uncovered_lines',
            'conditions_to_cover',
            'uncovered_conditions'
          ],
          qualifiers: ['FIL'],
          strategy: 'all',
          s: 'metric',
          metricSort: 'coverage',
          asc: true,
          p: 1,
          ps: 500,
          additionalFields: undefined
        }
      }
    ]);
  });

  it('fetches source lines for coverage details from the documented endpoint', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        return {
          sources: [{ line: 1, code: 'let x = 1;', lineHits: 2 }]
        };
      }
    );

    await expect(
      client.getSourceLines({ key: 'app:src/main.ts', branch: 'main' })
    ).resolves.toEqual({
      sources: [{ line: 1, code: 'let x = 1;', lineHits: 2 }]
    });
    expect(requests).toEqual([
      {
        path: '/sources/lines',
        params: {
          key: 'app:src/main.ts',
          branch: 'main',
          pullRequest: undefined
        }
      }
    ]);
  });

  it('searches duplicated files with project measures and component tree metrics', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path === '/measures/component') {
          return {
            component: {
              key: 'app',
              measures: [
                { metric: 'duplicated_lines', value: '30' },
                { metric: 'duplicated_blocks', value: '2' },
                { metric: 'duplicated_lines_density', value: '4.5' }
              ]
            }
          };
        }

        if (path === '/measures/component_tree') {
          return {
            paging: {
              pageIndex: 1,
              pageSize: 10,
              total: 2
            },
            components: [
              {
                key: 'app:src/duplicated.ts',
                name: 'duplicated.ts',
                path: 'src/duplicated.ts',
                measures: [
                  { metric: 'duplicated_lines', value: '3' },
                  { metric: 'duplicated_blocks', value: '1' },
                  { metric: 'duplicated_lines_density', value: '25.0' }
                ]
              },
              {
                key: 'app:src/clean.ts',
                name: 'clean.ts',
                path: 'src/clean.ts',
                measures: [{ metric: 'duplicated_lines', value: '0' }]
              }
            ]
          };
        }

        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.searchDuplicatedFiles({
        projectKey: 'app',
        branch: 'main',
        pageIndex: 1,
        pageSize: 10
      })
    ).resolves.toMatchObject({
      items: [
        {
          key: 'app:src/duplicated.ts',
          name: 'duplicated.ts',
          path: 'src/duplicated.ts',
          duplicatedLines: 3,
          duplicatedBlocks: 1,
          duplicatedLinesDensity: '25.0'
        }
      ],
      page: {
        page: 1,
        pageSize: 10,
        total: 2,
        hasNextPage: false
      },
      summary: {
        duplicatedLines: 30,
        duplicatedBlocks: 2,
        duplicatedLinesDensity: '4.5'
      }
    });
    expect(requests).toEqual([
      {
        path: '/measures/component',
        params: {
          component: 'app',
          metricKeys: ['duplicated_lines', 'duplicated_blocks', 'duplicated_lines_density'],
          branch: 'main',
          pullRequest: undefined,
          additionalFields: 'metrics'
        }
      },
      {
        path: '/measures/component_tree',
        params: {
          component: 'app',
          branch: 'main',
          metricKeys: ['duplicated_lines', 'duplicated_blocks', 'duplicated_lines_density'],
          pullRequest: undefined,
          qualifiers: ['FIL'],
          strategy: 'leaves',
          p: 1,
          ps: 10,
          additionalFields: 'metrics'
        }
      }
    ]);
  });

  it('uses optional organization for quality gates and q-only language search', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'cloud' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        if (path === '/qualitygates/list') return { qualitygates: [] };
        if (path === '/languages/list') return { languages: [] };
        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(client.listQualityGates()).resolves.toEqual({
      items: [],
      page: undefined
    });
    await expect(client.listLanguages({ query: 'java' })).resolves.toEqual({
      items: [],
      page: undefined
    });

    expect(requests).toEqual([
      {
        path: '/qualitygates/list',
        params: {
          organization: undefined
        }
      },
      {
        path: '/languages/list',
        params: {
          q: 'java'
        }
      }
    ]);
  });

  it('uses official Cloud v2 dependency risk feature and search endpoints', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'cloud', organization: 'acme' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { getV2: unknown }).getV2 = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });
        if (path === '/sca/feature-enabled') return { enabled: true };
        if (path === '/sca/issues-releases') {
          return {
            issuesReleases: [],
            page: {
              pageIndex: 1,
              pageSize: 100,
              total: 0
            }
          };
        }
        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.searchDependencyRisks({
        projectKey: 'app',
        pullRequest: '42',
        pageIndex: 1,
        pageSize: 100
      })
    ).resolves.toMatchObject({
      issuesReleases: [],
      page: {
        pageIndex: 1,
        pageSize: 100,
        total: 0
      }
    });

    expect(requests).toEqual([
      {
        path: '/sca/feature-enabled',
        params: {
          organization: 'acme'
        }
      },
      {
        path: '/sca/issues-releases',
        params: {
          projectKey: 'app',
          branchKey: undefined,
          pullRequestKey: '42',
          pageIndex: 1,
          pageSize: 100
        }
      }
    ]);
  });

  it('uses official Server v2 dependency risk endpoint after version and feature checks', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let v1Requests: Array<{ path: string; params?: Record<string, unknown> }> = [];
    let v2Requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { getServerVersion: unknown }).getServerVersion = vi.fn(
      async () => '2025.4.0.1234'
    );
    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        v1Requests.push({ path, params });
        if (path === '/features/list') return ['sca'];
        throw new Error(`Unexpected request ${path}`);
      }
    );
    (client as unknown as { getV2: unknown }).getV2 = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        v2Requests.push({ path, params });
        if (path === '/v2/sca/issues-releases') {
          return {
            issuesReleases: [],
            page: {
              pageIndex: 2,
              pageSize: 50,
              total: 0
            }
          };
        }
        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.searchDependencyRisks({
        projectKey: 'app',
        branch: 'main',
        pageIndex: 2,
        pageSize: 50
      })
    ).resolves.toMatchObject({
      issuesReleases: [],
      page: {
        pageIndex: 2,
        pageSize: 50,
        total: 0
      }
    });

    expect(v1Requests).toEqual([{ path: '/features/list', params: undefined }]);
    expect(v2Requests).toEqual([
      {
        path: '/v2/sca/issues-releases',
        params: {
          projectKey: 'app',
          branchKey: 'main',
          pullRequestKey: undefined,
          pageIndex: 2,
          pageSize: 50
        }
      }
    ]);
  });

  it('uses official Cloud v2 advanced analysis entitlement and analysis endpoints', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'cloud', organization: 'acme' }
    });
    let getRequests: Array<{ path: string; params?: Record<string, unknown> }> = [];
    let postRequests: Array<{ path: string; data?: Record<string, unknown> }> = [];

    (client as unknown as { getV2: unknown }).getV2 = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        getRequests.push({ path, params });
        if (path === '/organizations/organizations') return [{ uuidV4: 'org-uuid' }];
        if (path === '/a3s-analysis/org-config/org-uuid') return { enabled: true };
        throw new Error(`Unexpected request ${path}`);
      }
    );
    (client as unknown as { postJsonV2: unknown }).postJsonV2 = vi.fn(
      async (_operation: string, path: string, data: Record<string, unknown>) => {
        postRequests.push({ path, data });
        if (path === '/a3s-analysis/analyses') {
          return {
            issues: [],
            errors: [{ code: 'WARN', message: 'Non-fatal warning' }]
          };
        }
        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.runAdvancedCodeAnalysis({
        organizationKey: 'acme',
        projectKey: 'app',
        branchName: 'main',
        filePath: 'src/main.ts',
        fileContent: 'const value = 1;',
        fileScope: 'MAIN'
      })
    ).resolves.toEqual({
      issues: [],
      errors: [{ code: 'WARN', message: 'Non-fatal warning' }]
    });

    expect(getRequests).toEqual([
      {
        path: '/organizations/organizations',
        params: {
          organizationKey: 'acme',
          excludeEligibility: true
        }
      },
      {
        path: '/a3s-analysis/org-config/org-uuid',
        params: undefined
      }
    ]);
    expect(postRequests).toEqual([
      {
        path: '/a3s-analysis/analyses',
        data: {
          organizationKey: 'acme',
          projectKey: 'app',
          branchName: 'main',
          filePath: 'src/main.ts',
          fileContent: 'const value = 1;',
          fileScope: 'MAIN'
        }
      }
    ]);
  });

  it('requests system status anonymously for SonarQube Server', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let authenticatedGet = vi.fn();
    let anonymousGet = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        expect(path).toBe('/system/status');
        expect(params).toBeUndefined();
        return {
          status: 'UP',
          id: 'server-id',
          version: '2025.4'
        };
      }
    );

    (client as unknown as { get: unknown }).get = authenticatedGet;
    (client as unknown as { getAnonymous: unknown }).getAnonymous = anonymousGet;

    await expect(client.getSystemStatus()).resolves.toEqual({
      status: 'UP',
      id: 'server-id',
      version: '2025.4'
    });
    expect(authenticatedGet).not.toHaveBeenCalled();
    expect(anonymousGet).toHaveBeenCalledTimes(1);
  });

  it('serializes rule show params with organization only when configured', () => {
    expect(
      serializeSonarParams(
        ruleShowParams({ deployment: 'cloud', organization: 'acme' }, 'java:S1541', undefined)
      )
    ).toBe('organization=acme&key=java%3AS1541');

    expect(
      serializeSonarParams(
        ruleShowParams(
          { deployment: 'server', organization: 'ignored' },
          'java:S1541',
          'also-ignored'
        )
      )
    ).toBe('key=java%3AS1541');

    expect(
      serializeSonarParams(ruleShowParams({ deployment: 'cloud' }, 'java:S1541', undefined))
    ).toBe('key=java%3AS1541');
  });
});
