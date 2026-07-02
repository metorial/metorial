import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { RemoteConfigClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let getRemoteConfig = SlateTool.create(spec, {
  name: 'Get Remote Config',
  key: 'get_remote_config',
  description: `Retrieve the current Firebase Remote Config template including all parameters, conditions, and parameter groups. Also supports listing version history for audit and rollback purposes.`,
  tags: {
    readOnly: true
  }
})
  .scopes(firebaseActionScopes.getRemoteConfig)
  .input(
    z.object({
      includeVersionHistory: z
        .boolean()
        .optional()
        .describe('Also fetch recent version history. Defaults to false.'),
      historyPageSize: z
        .number()
        .optional()
        .describe('Number of versions to return. Defaults to 10.'),
      historyPageToken: z
        .string()
        .optional()
        .describe('Page token for fetching more version history')
    })
  )
  .output(
    z.object({
      parameters: z.record(z.string(), z.any()).describe('Remote Config parameters'),
      conditions: z
        .array(
          z.object({
            name: z.string(),
            expression: z.string(),
            tagColor: z.string().optional()
          })
        )
        .describe('Conditions defined in the template'),
      parameterGroups: z.record(z.string(), z.any()).describe('Parameter groups'),
      etag: z.string().describe('ETag for the current template version (needed for updates)'),
      version: z.any().optional().describe('Current version metadata'),
      versionHistory: z
        .array(
          z.object({
            versionNumber: z.string(),
            updateTime: z.string(),
            updateUser: z.object({ email: z.string().optional() }).optional(),
            updateOrigin: z.string().optional(),
            updateType: z.string().optional(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('Recent version history'),
      historyNextPageToken: z
        .string()
        .optional()
        .describe('Token for fetching more version history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RemoteConfigClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let template = await client.getTemplate();

    let output: any = {
      parameters: template.parameters || {},
      conditions: template.conditions || [],
      parameterGroups: template.parameterGroups || {},
      etag: template.etag,
      version: template.version
    };

    if (ctx.input.includeVersionHistory) {
      let history = await client.listVersions({
        pageSize: ctx.input.historyPageSize,
        pageToken: ctx.input.historyPageToken
      });
      output.versionHistory = history.versions;
      output.historyNextPageToken = history.nextPageToken;
    }

    let paramCount = Object.keys(template.parameters || {}).length;
    return {
      output,
      message: `Retrieved Remote Config template with **${paramCount}** parameter(s) and **${(template.conditions || []).length}** condition(s).`
    };
  })
  .build();
