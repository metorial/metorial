import { describe, expect, it } from 'vitest';
import {
  cloudV1BaseUrl,
  cloudV2BaseUrl,
  metricsSearchParams,
  normalizeServerBaseUrl,
  pageNumber,
  pageSize,
  projectKeyFor,
  requireCloudOrganization,
  requireOneProjectStatusIdentifier,
  requireServerDeployment,
  serializeSonarParams,
  validateAuthenticationResponse
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
    expect(() => pageNumber(0)).toThrow(/page/);
    expect(() => pageSize(0, 50, 500)).toThrow(/pageSize/);
  });

  it('enforces Cloud organization requirements only for Cloud configs', () => {
    expect(requireCloudOrganization({ deployment: 'server' }, undefined)).toBeUndefined();
    expect(
      requireCloudOrganization({ deployment: 'cloud', organization: 'acme' }, undefined)
    ).toBe('acme');
    expect(requireCloudOrganization({ deployment: 'cloud' }, 'override')).toBe('override');
    expect(() => requireCloudOrganization({ deployment: 'cloud' }, undefined)).toThrow(
      /organization/
    );
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

  it('requests only supported metric fields from metrics search', () => {
    expect(metricsSearchParams({ page: 2, pageSize: 10, query: 'coverage' })).toEqual({
      p: 2,
      ps: 10,
      f: 'name,description,domain',
      q: 'coverage'
    });
  });
});
