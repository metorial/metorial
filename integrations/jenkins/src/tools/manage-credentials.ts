import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let manageCredentials = SlateTool.create(spec, {
  name: 'Manage Credentials',
  key: 'manage_credentials',
  description: `List, get, create, update, or delete credentials stored in Jenkins. Credentials are used in jobs and pipelines for authenticating with external services.
Supports scoping credentials to specific domains and folders.`,
  instructions: [
    'For creating/updating credentials, use XML configuration format.',
    'Example XML for username/password credential: <com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl><scope>GLOBAL</scope><id>my-cred-id</id><username>user</username><password>pass</password></com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      credentialId: z
        .string()
        .optional()
        .describe('ID of the credential. Required for "get", "update", and "delete".'),
      xmlConfig: z
        .string()
        .optional()
        .describe('XML configuration for the credential. Required for "create" and "update".'),
      domain: z
        .string()
        .optional()
        .describe('Credential domain. Defaults to the global domain "_".'),
      folderPath: z.string().optional().describe('Folder path to scope the credentials to.')
    })
  )
  .output(
    z.object({
      credentials: z
        .array(
          z.object({
            credentialId: z.string().optional().describe('Credential ID'),
            typeName: z.string().optional().describe('Credential type display name'),
            displayName: z.string().optional().describe('Display name'),
            description: z.string().optional().nullable().describe('Credential description')
          })
        )
        .optional()
        .describe('List of credentials (for "list" action)'),
      credential: z
        .object({
          credentialId: z.string().optional().describe('Credential ID'),
          typeName: z.string().optional().describe('Credential type'),
          displayName: z.string().optional().describe('Display name'),
          description: z.string().optional().nullable().describe('Description')
        })
        .optional()
        .describe('Credential details (for "get" action)'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let { action, credentialId, xmlConfig, domain, folderPath } = ctx.input;

    if (action === 'list') {
      let data = await client.listCredentials(domain, folderPath);
      let creds = (data.credentials || []).map((c: any) => ({
        credentialId: c.id,
        typeName: c.typeName,
        displayName: c.displayName,
        description: c.description
      }));
      return {
        output: { credentials: creds, success: true },
        message: `Found **${creds.length}** credential(s).`
      };
    }

    if (action === 'get') {
      if (!credentialId) throw new Error('credentialId is required for get action');
      let cred = await client.getCredential(credentialId, domain, folderPath);
      return {
        output: {
          credential: {
            credentialId: cred.id,
            typeName: cred.typeName,
            displayName: cred.displayName,
            description: cred.description
          },
          success: true
        },
        message: `Credential **${cred.displayName || credentialId}** — type: ${cred.typeName || 'unknown'}.`
      };
    }

    if (action === 'create') {
      if (!xmlConfig) throw new Error('xmlConfig is required for create action');
      await client.createCredential(xmlConfig, domain, folderPath);
      return {
        output: { success: true },
        message: `Credential created.`
      };
    }

    if (action === 'update') {
      if (!credentialId) throw new Error('credentialId is required for update action');
      if (!xmlConfig) throw new Error('xmlConfig is required for update action');
      await client.updateCredential(credentialId, xmlConfig, domain, folderPath);
      return {
        output: { success: true },
        message: `Credential **${credentialId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!credentialId) throw new Error('credentialId is required for delete action');
      await client.deleteCredential(credentialId, domain, folderPath);
      return {
        output: { success: true },
        message: `Credential **${credentialId}** deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
