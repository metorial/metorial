import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    clusterUrl: z
      .string()
      .describe('The Kubernetes API server URL (e.g. https://my-cluster.example.com:6443)'),
    namespace: z
      .string()
      .optional()
      .describe('Default namespace for operations. If not set, defaults to "default"'),
    skipTlsVerify: z
      .boolean()
      .optional()
      .describe('Skip TLS certificate verification for the API server. Use with caution.')
  })
);
