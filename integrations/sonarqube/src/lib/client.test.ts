import { describe, expect, it } from 'vitest';
import {
  duplicationFilesFromShowResponse,
  sourceTextFromRawResponse,
  validateLineRange
} from '../tools/source';
import {
  cloudV1BaseUrl,
  cloudV2BaseUrl,
  duplicationShowParams,
  hotspotProjectSearchParams,
  issueSearchParams,
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
  ruleSearchParams,
  ruleShowParams,
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
      total: 50
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
      total: 4
    });
  });

  it('uses default project keys and validates status identifiers', () => {
    expect(projectKeyFor({ defaultProjectKey: 'app' }, undefined)).toBe('app');
    expect(projectKeyFor({}, 'input')).toBe('input');
    expect(() => projectKeyFor({}, undefined)).toThrow(/projectKey/);

    expect(() => requireOneProjectStatusIdentifier({ projectKey: 'app' })).not.toThrow();
    expect(() =>
      requireOneProjectStatusIdentifier({ projectKey: 'app', analysisId: 'analysis' })
    ).toThrow(/exactly one/);
    expect(() => requireOneProjectStatusIdentifier({})).toThrow(/exactly one/);
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

  it('requests deployment-specific project measure period fields', () => {
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
      additionalFields: 'period'
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
      additionalFields: 'periods'
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
      key: 'app:src/main.ts'
    });

    expect(() =>
      sourceRawParams(
        { deployment: 'server' },
        {
          component: 'app:src/main.ts',
          branch: 'feature/example'
        }
      )
    ).toThrow(/SonarQube Cloud/);

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
      key: 'app:src/main.ts'
    });

    expect(() =>
      duplicationShowParams(
        { deployment: 'server' },
        {
          component: 'app:src/main.ts',
          pullRequest: '42'
        }
      )
    ).toThrow(/SonarQube Cloud/);

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
      project: 'app'
    });
    expect(
      serializeSonarParams(hotspotProjectSearchParams({ deployment: 'server' }, 'app'))
    ).toBe('project=app');
  });

  it('serializes deployment-specific project search parameters', () => {
    expect(
      serializeSonarParams(
        projectSearchParams(
          { deployment: 'cloud', organization: 'acme' },
          {
            query: 'api',
            projectKeys: ['app'],
            qualifiers: ['APP']
          }
        )
      )
    ).toBe('organization=acme&q=api&projects=app&p=1&ps=50');

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
    ).toBe('q=api&projectKeys=app%2Clib&qualifiers=TRK%2CAPP&p=2&ps=25');
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
            issueStatuses: ['OPEN'],
            pageSize: 10
          }
        )
      )
    ).toBe('components=app%2Capp%3Asrc%2Fmain.ts&issueStatuses=OPEN&p=1&ps=10');
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

  it('serializes rule show params with organization only when Cloud requires it', () => {
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

    expect(() => ruleShowParams({ deployment: 'cloud' }, 'java:S1541', undefined)).toThrow(
      /organization/
    );
  });
});
