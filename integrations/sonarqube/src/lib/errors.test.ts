import { describe, expect, it } from 'vitest';
import { sonarqubeApiError, sonarqubeValidationError } from './errors';

describe('SonarQube errors', () => {
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
});
