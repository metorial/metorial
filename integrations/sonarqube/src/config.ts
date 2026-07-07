import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    deployment: z
      .enum(['server', 'cloud'])
      .default('server')
      .describe(
        'Use "server" for self-hosted SonarQube Server or "cloud" for SonarQube Cloud.'
      ),
    serverBaseUrl: z
      .string()
      .optional()
      .describe(
        'Base URL for SonarQube Server, for example https://sonarqube.example.com. Required when deployment is server.'
      ),
    cloudRegion: z
      .enum(['eu', 'us'])
      .default('eu')
      .describe('SonarQube Cloud region. Use eu for sonarcloud.io or us for sonarqube.us.'),
    organization: z
      .string()
      .optional()
      .describe(
        'SonarQube Cloud organization key, applied automatically to organization-scoped tools. Required when deployment is cloud; not used for SonarQube Server.'
      ),
    defaultProjectKey: z
      .string()
      .optional()
      .describe(
        'Default SonarQube project key used by project-scoped tools when projectKey is omitted.'
      )
  })
);
