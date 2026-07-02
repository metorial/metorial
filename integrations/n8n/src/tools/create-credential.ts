import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCredential = SlateTool.create(spec, {
  name: 'Create Credential',
  key: 'create_credential',
  description: `Create a new credential in n8n. Use the **Get Credential Schema** tool first to understand the required fields for a given credential type.`,
  instructions: [
    'Use the get_credential_schema tool to discover required fields before creating a credential.',
    'The data object must match the schema for the specified credential type.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Display name for the credential'),
      type: z.string().describe('Credential type identifier (e.g. "slackApi", "githubApi")'),
      credentialData: z
        .record(z.string(), z.any())
        .describe('Credential data object matching the schema for the given type')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the created credential'),
      name: z.string().describe('Credential name'),
      type: z.string().describe('Credential type'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let credential = await client.createCredential({
      name: ctx.input.name,
      type: ctx.input.type,
      data: ctx.input.credentialData
    });

    return {
      output: {
        credentialId: String(credential.id),
        name: credential.name || '',
        type: credential.type || '',
        createdAt: credential.createdAt
      },
      message: `Created credential **"${credential.name}"** of type **${credential.type}** (ID: ${credential.id}).`
    };
  })
  .build();
