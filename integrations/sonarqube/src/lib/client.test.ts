import { describe, expect, it, vi } from 'vitest';
import {
  duplicationFilesFromShowResponse,
  sourceTextFromRawResponse,
  validateLineRange
} from '../tools/source';
import {
  cloudV1BaseUrl,
  cloudV2BaseUrl,
  componentTreeMeasuresParams,
  duplicationShowParams,
  hotspotProjectSearchParams,
  issueSearchParams,
  issueTransitionParams,
  metricsSearchParams,
  normalizePage,
  normalizeServerBaseUrl,
  optionalCloudOrganization,
  optionalPageSizeIncludingAll,
  pageNumber,
  pageSize,
  projectAnalysisComponentIdFromBranches,
  projectKeyFor,
  projectMeasuresParams,
  projectSearchParams,
  requireCloudOrganization,
  requireOneProjectStatusIdentifier,
  requireServerDeployment,
  ruleSearchParams,
  ruleShowParams,
  SonarQubeClient,
  serializeSonarParams,
  sourceRawParams,
  sourceScmParams,
  sourceShowParams,
  validateAuthenticationResponse,
  validateComputeTaskAdditionalFields,
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

  it('serializes workflow POST parameters as form-compatible Sonar values', () => {
    expect(
      serializeSonarParams({
        key: 'ISSUE-1',
        status: 'accept',
        tags: ['security', 'triaged'],
        comment: 'Reviewed',
        empty: undefined
      })
    ).toBe('key=ISSUE-1&status=accept&tags=security%2Ctriaged&comment=Reviewed');
    expect(issueTransitionParams({ issueKey: 'ISSUE-1', status: 'reopen' })).toEqual({
      key: 'ISSUE-1',
      status: 'reopen'
    });
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
    ).toThrow(/either branch or pullRequest/);
    expect(() =>
      validateQualityGateStatusParams({ projectId: 'uuid', branch: 'main' })
    ).toThrow(/projectKey/);
    expect(() =>
      validateQualityGateStatusParams({ analysisId: 'analysis', pullRequest: '42' })
    ).toThrow(/projectKey/);
    expect(() =>
      validateQualityGateStatusParams({
        analysisId: 'analysis',
        projectKey: 'app',
        branch: 'main'
      })
    ).not.toThrow();
  });

  it('validates compute task additional fields by deployment', () => {
    expect(() =>
      validateComputeTaskAdditionalFields({ deployment: 'server' }, [
        'scannerContext',
        'warnings',
        'stacktrace'
      ])
    ).not.toThrow();
    expect(() =>
      validateComputeTaskAdditionalFields({ deployment: 'cloud' }, ['scannerContext'])
    ).not.toThrow();
    expect(() =>
      validateComputeTaskAdditionalFields({ deployment: 'cloud' }, ['stacktrace'])
    ).toThrow(/Server/);
    expect(() =>
      validateComputeTaskAdditionalFields({ deployment: 'server' }, ['unsupported'])
    ).toThrow(/Unsupported/);
  });

  it('selects the legacy main-branch component id for Cloud CE status fallback', () => {
    expect(
      projectAnalysisComponentIdFromBranches([
        {
          name: 'feature',
          isMain: false,
          branchUuidV1: 'AZ-feature'
        },
        {
          name: 'main',
          isMain: true,
          branchUuidV1: 'AZ-main',
          branchId: 'modern-main-id'
        }
      ])
    ).toBe('AZ-main');
  });

  it('retries Cloud analysis status with the readable main branch component id', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'cloud', organization: 'acme' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path === '/ce/component' && params?.component === 'company_tracker-application') {
          throw new Error('The requested resource was not found.');
        }

        if (path === '/project_branches/list') {
          return {
            branches: [
              {
                name: 'main',
                type: 'LONG',
                isMain: true,
                branchUuidV1: 'AZ-main-component'
              }
            ]
          };
        }

        if (path === '/ce/component' && params?.componentId === 'AZ-main-component') {
          return {
            queue: [],
            current: {
              componentId: 'AZ-main-component',
              componentKey: 'company_tracker-application',
              status: 'SUCCESS'
            }
          };
        }

        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.getProjectAnalysisStatus('company_tracker-application')
    ).resolves.toMatchObject({
      current: {
        componentId: 'AZ-main-component',
        componentKey: 'company_tracker-application',
        status: 'SUCCESS'
      }
    });
    expect(requests).toEqual([
      {
        path: '/ce/component',
        params: { component: 'company_tracker-application' }
      },
      {
        path: '/project_branches/list',
        params: { project: 'company_tracker-application' }
      },
      {
        path: '/ce/component',
        params: { componentId: 'AZ-main-component' }
      }
    ]);
  });

  it('returns a structured unavailable status when Cloud CE component status is hidden', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'cloud', organization: 'acme' }
    });

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        if (path === '/project_branches/list') {
          return {
            branches: [
              {
                name: 'main',
                isMain: true,
                branchUuidV1: 'AZ-main-component'
              }
            ]
          };
        }

        if (
          path === '/ce/component' &&
          (params?.component === 'company_tracker-application' ||
            params?.componentId === 'AZ-main-component')
        ) {
          throw new Error('The requested resource was not found.');
        }

        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.getProjectAnalysisStatus('company_tracker-application')
    ).resolves.toMatchObject({
      queue: [],
      statusUnavailable: {
        projectKey: 'company_tracker-application',
        reason: 'ce_component_not_found'
      }
    });
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
    expect(metricsSearchParams({ page: 2, pageSize: 10, query: 'coverage' })).toEqual({
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
      sourceShowParams({
        component: 'app:src/main.ts',
        fromLine: 2,
        toLine: 4
      })
    ).toEqual({
      key: 'app:src/main.ts',
      from: 2,
      to: 4
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
    ).toThrow(/either branch or pullRequest/);
  });

  it('slices raw source text with documented integer line ranges', () => {
    expect(
      sourceTextFromRawResponse('line 1\nline 2\nline 3\nline 4', {
        fromLine: 2,
        toLine: 3
      })
    ).toBe('line 2\nline 3');

    expect(sourceTextFromRawResponse('line 1\r\nline 2\r\nline 3', { fromLine: 2 })).toBe(
      'line 2\nline 3'
    );

    expect(() => validateLineRange({ fromLine: 1.5 })).toThrow(/positive integer/);
    expect(() => validateLineRange({ toLine: 0 })).toThrow(/positive integer/);
    expect(() => validateLineRange({ fromLine: 3, toLine: 2 })).toThrow(
      /greater than or equal/
    );
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
            projectKeys: ['app'],
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
            projectKeys: ['app', 'lib'],
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

  it('looks up exact project keys with components show and filters qualifiers', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path !== '/components/show') {
          throw new Error(`Unexpected request ${path}`);
        }

        if (params?.component === 'app') {
          return {
            component: {
              key: 'app',
              name: 'App',
              qualifier: 'TRK'
            }
          };
        }

        if (params?.component === 'view') {
          return {
            component: {
              key: 'view',
              name: 'View',
              qualifier: 'VW'
            }
          };
        }

        throw new Error(`Unexpected component ${params?.component}`);
      }
    );

    await expect(
      client.searchProjects({
        projectKeys: [' app ', 'view'],
        qualifiers: ['TRK']
      })
    ).resolves.toEqual({
      items: [
        {
          key: 'app',
          name: 'App',
          qualifier: 'TRK'
        }
      ],
      page: {
        page: 1,
        pageSize: 1,
        total: 1,
        hasNextPage: false
      }
    });
    expect(requests).toEqual([
      {
        path: '/components/show',
        params: { component: 'app' }
      },
      {
        path: '/components/show',
        params: { component: 'view' }
      }
    ]);
  });

  it('merges exact project lookups with query search results by key', async () => {
    let client = new SonarQubeClient({
      auth: { token: 'token' },
      config: { deployment: 'server', serverBaseUrl: 'https://sonarqube.example.com' }
    });
    let requests: Array<{ path: string; params?: Record<string, unknown> }> = [];

    (client as unknown as { get: unknown }).get = vi.fn(
      async (_operation: string, path: string, params?: Record<string, unknown>) => {
        requests.push({ path, params });

        if (path === '/components/search') {
          return {
            paging: {
              pageIndex: 1,
              pageSize: 500,
              total: 2
            },
            components: [
              {
                key: 'app',
                name: 'App from query',
                qualifier: 'TRK'
              },
              {
                key: 'lib',
                name: 'Library',
                qualifier: 'TRK'
              }
            ]
          };
        }

        if (path === '/components/show' && params?.component === 'app') {
          return {
            component: {
              key: 'app',
              name: 'App exact',
              qualifier: 'TRK'
            }
          };
        }

        throw new Error(`Unexpected request ${path}`);
      }
    );

    await expect(
      client.searchProjects({
        query: 'app',
        projectKeys: ['app']
      })
    ).resolves.toEqual({
      items: [
        {
          key: 'app',
          name: 'App exact',
          qualifier: 'TRK'
        },
        {
          key: 'lib',
          name: 'Library',
          qualifier: 'TRK'
        }
      ],
      page: {
        page: 1,
        pageSize: 500,
        total: 2,
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
      },
      {
        path: '/components/show',
        params: { component: 'app' }
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
    ).toThrow(/either branch or pullRequest/);

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
    ).toThrow(/either branch or pullRequest/);
  });

  it('serializes component tree measures parameters for duplicated file search', () => {
    expect(
      serializeSonarParams(
        componentTreeMeasuresParams({
          component: 'app',
          branch: 'main',
          metricKeys: ['duplicated_lines'],
          qualifiers: ['FIL'],
          strategy: 'all'
        })
      )
    ).toBe(
      'component=app&branch=main&metricKeys=duplicated_lines&qualifiers=FIL&strategy=all&p=1&ps=500'
    );

    expect(() =>
      componentTreeMeasuresParams({
        component: 'app',
        branch: 'main',
        pullRequest: '42',
        metricKeys: ['duplicated_lines']
      })
    ).toThrow(/either branch or pullRequest/);
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
          strategy: 'all',
          p: 1,
          ps: 10,
          additionalFields: 'metrics'
        }
      }
    ]);
  });

  it('serializes rule search params according to Cloud and Server API contracts', () => {
    expect(
      serializeSonarParams(
        ruleSearchParams(
          { deployment: 'cloud', organization: 'acme' },
          {
            languages: ['java'],
            page: 2,
            pageSize: 999
          }
        )
      )
    ).toBe(
      'organization=acme&languages=java&f=name%2Crepo%2Clang%2ClangName%2Cseverity%2Cstatus%2Ctags%2CsysTags&p=2&ps=500'
    );

    expect(
      serializeSonarParams(
        ruleSearchParams(
          { deployment: 'server', organization: 'acme' },
          {
            organization: 'ignored-on-server',
            pageSize: 10
          }
        )
      )
    ).toBe('f=name%2Crepo%2Clang%2ClangName%2Cseverity%2Cstatus%2Ctags%2CsysTags&p=1&ps=10');
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
