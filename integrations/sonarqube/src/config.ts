import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    deployment: {
      schema: z
        .enum(['server', 'cloud'])
        .default('server')
        .describe(
          'Use "server" for self-hosted SonarQube Server or "cloud" for SonarQube Cloud.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    serverBaseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'Base URL for SonarQube Server, for example https://sonarqube.example.com. Required when deployment is server.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    cloudRegion: {
      schema: z
        .enum(['eu', 'us'])
        .default('eu')
        .describe('SonarQube Cloud region. Use eu for sonarcloud.io or us for sonarqube.us.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organization: {
      schema: z
        .string()
        .optional()
        .describe(
          'SonarQube Cloud organization key, applied automatically to organization-scoped tools. Required when deployment is cloud; not used for SonarQube Server.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultProjectKey: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default SonarQube project key used by project-scoped tools when projectKey is omitted.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
