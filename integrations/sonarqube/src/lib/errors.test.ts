import { describe, expect, it } from 'vitest';
import { sonarqubeApiError, sonarqubeValidationError } from './errors';

let upstreamError = (message: string) => ({
  response: {
    status: 400,
    data: {
      errors: [{ msg: message }]
    }
  }
});

describe('SonarQube API error normalization', () => {
  it('creates validation ServiceErrors with SonarQube reason metadata', () => {
    let error = sonarqubeValidationError('projectKey is required.');

    expect(error.message).toContain('projectKey is required');
    expect(error.data.reason).toBe('sonarqube_validation_error');
  });

  it('normalizes SonarQube errors array messages', () => {
    let error = sonarqubeApiError(
      {
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: {
            errors: [{ msg: 'The project does not exist.' }]
          }
        }
      },
      'search projects'
    );

    expect(error.message).toContain('SonarQube API search projects failed');
    expect(error.message).toContain('HTTP 400 Bad Request');
    expect(error.message).toContain('The project does not exist.');
    expect(error.data.reason).toBe('sonarqube_api_error');
    expect(error.data.upstreamStatus).toBe(400);
  });

  it('adds rate limit context for 429 responses', () => {
    let error = sonarqubeApiError(
      {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: {}
        }
      },
      'search issues'
    );

    expect(error.message).toContain('HTTP 429 Too Many Requests');
    expect(error.message).toContain('rate-limit');
    expect(error.data.upstreamStatus).toBe(429);
  });

  it('adds project lookup diagnostics to missing project responses', () => {
    let error = sonarqubeApiError(
      upstreamError("Project doesn't exist"),
      'get project measures'
    );

    expect(error.data.message).toContain("Project doesn't exist");
    expect(error.data.message).toContain('search_projects');
    expect(error.data.message).toContain('cloudRegion');
    expect(error.data.message).toContain('Browse permission');
  });

  it('adds project lookup diagnostics to missing component-key responses', () => {
    let error = sonarqubeApiError(
      upstreamError("Component key 'tractivecloud_tracker-application' not found"),
      'get project analysis status'
    );

    expect(error.data.message).toContain(
      "Component key 'tractivecloud_tracker-application' not found"
    );
    expect(error.data.message).toContain('get_component');
    expect(error.data.message).toContain('branch or pullRequest');
  });

  it('keeps generic not-found diagnostics scoped to project-aware operations', () => {
    let projectError = sonarqubeApiError(
      upstreamError('The requested resource was not found.'),
      'search security hotspots'
    );
    let issueError = sonarqubeApiError(
      upstreamError('The requested resource was not found.'),
      'get issue changelog'
    );

    expect(projectError.data.message).toContain('search_projects');
    expect(issueError.data.message).not.toContain('search_projects');
  });
});
