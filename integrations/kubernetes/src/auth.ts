import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Bearer token for Kubernetes API authentication'),
      clientCertificate: z
        .string()
        .optional()
        .describe('PEM-encoded client certificate for mTLS authentication'),
      clientKey: z
        .string()
        .optional()
        .describe('PEM-encoded client private key for mTLS authentication'),
      caCertificate: z
        .string()
        .optional()
        .describe('PEM-encoded CA certificate to verify the API server')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Kubernetes bearer token (Service Account token or other JWT)'),
      caCertificate: z
        .string()
        .optional()
        .describe('PEM-encoded CA certificate to verify the API server')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          caCertificate: ctx.input.caCertificate
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client Certificate',
    key: 'client_certificate',
    inputSchema: z.object({
      clientCertificate: z
        .string()
        .describe('PEM-encoded client certificate signed by the cluster CA'),
      clientKey: z.string().describe('PEM-encoded client private key'),
      caCertificate: z
        .string()
        .optional()
        .describe('PEM-encoded CA certificate to verify the API server')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: '',
          clientCertificate: ctx.input.clientCertificate,
          clientKey: ctx.input.clientKey,
          caCertificate: ctx.input.caCertificate
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Kubeconfig',
    key: 'kubeconfig',
    inputSchema: z.object({
      kubeconfig: z
        .string()
        .describe('Full kubeconfig file contents (YAML). The current-context will be used.')
    }),
    getOutput: async ctx => {
      let parsed = parseKubeconfig(ctx.input.kubeconfig);
      return {
        output: {
          token: parsed.token || '',
          clientCertificate: parsed.clientCertificate,
          clientKey: parsed.clientKey,
          caCertificate: parsed.caCertificate
        }
      };
    }
  });

let parseKubeconfig = (
  raw: string
): {
  token?: string;
  clientCertificate?: string;
  clientKey?: string;
  caCertificate?: string;
} => {
  // Simple YAML-like parser for kubeconfig
  // Kubeconfig is a YAML file; we parse the essential fields
  let lines = raw.split('\n');
  let result: Record<string, any> = {};

  // Find current-context
  let currentContext = '';
  for (let line of lines) {
    let match = line.match(/^current-context:\s*(.+)/);
    if (match?.[1]) {
      currentContext = match[1].trim().replace(/^["']|["']$/g, '');
      break;
    }
  }

  // Find the context entry to get cluster and user names
  let contextCluster = '';
  let contextUser = '';
  let inContexts = false;
  let inTargetContext = false;
  for (let line of lines) {
    if (line.match(/^contexts:/)) {
      inContexts = true;
      continue;
    }
    if (inContexts && line.match(/^[a-z]/)) {
      inContexts = false;
      continue;
    }
    if (inContexts && line.includes('name:') && line.includes(currentContext)) {
      inTargetContext = true;
      continue;
    }
    if (inTargetContext && line.includes('cluster:')) {
      let part = line.split('cluster:')[1];
      if (part) contextCluster = part.trim().replace(/^["']|["']$/g, '');
    }
    if (inTargetContext && line.includes('user:')) {
      let part = line.split('user:')[1];
      if (part) contextUser = part.trim().replace(/^["']|["']$/g, '');
    }
    if (inTargetContext && contextCluster && contextUser) break;
    if (inContexts && line.match(/^\s*- name:/) && inTargetContext) break;
  }

  // Find user credentials
  let inUsers = false;
  let inTargetUser = false;
  for (let line of lines) {
    if (line.match(/^users:/)) {
      inUsers = true;
      continue;
    }
    if (inUsers && line.match(/^[a-z]/)) {
      inUsers = false;
      continue;
    }
    if (inUsers && line.includes('name:') && line.includes(contextUser)) {
      inTargetUser = true;
      continue;
    }
    if (inTargetUser) {
      if (line.includes('client-certificate-data:')) {
        let b64 = line.split('client-certificate-data:')[1] || '';
        result.clientCertificate = atob(b64.trim());
      }
      if (line.includes('client-key-data:')) {
        let b64 = line.split('client-key-data:')[1] || '';
        result.clientKey = atob(b64.trim());
      }
      if (line.includes('token:') && !line.includes('token-file')) {
        let part = line.split('token:')[1] || '';
        result.token = part.trim().replace(/^["']|["']$/g, '');
      }
    }
    if (inUsers && line.match(/^\s*- name:/) && inTargetUser && !line.includes(contextUser))
      break;
  }

  // Find cluster CA
  let inClusters = false;
  let inTargetCluster = false;
  for (let line of lines) {
    if (line.match(/^clusters:/)) {
      inClusters = true;
      continue;
    }
    if (inClusters && line.match(/^[a-z]/)) {
      inClusters = false;
      continue;
    }
    if (inClusters && line.includes('name:') && line.includes(contextCluster)) {
      inTargetCluster = true;
      continue;
    }
    if (inTargetCluster && line.includes('certificate-authority-data:')) {
      let b64 = line.split('certificate-authority-data:')[1] || '';
      result.caCertificate = atob(b64.trim());
    }
    if (
      inClusters &&
      line.match(/^\s*- name:/) &&
      inTargetCluster &&
      !line.includes(contextCluster)
    )
      break;
  }

  return result;
};
