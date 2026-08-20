import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    clusterUrl: {
      schema: z
        .string()
        .describe('The Kubernetes API server URL (e.g. https://my-cluster.example.com:6443)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    namespace: {
      schema: z
        .string()
        .optional()
        .describe('Default namespace for operations. If not set, defaults to "default"'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    skipTlsVerify: {
      schema: z
        .boolean()
        .optional()
        .describe('Skip TLS certificate verification for the API server. Use with caution.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
