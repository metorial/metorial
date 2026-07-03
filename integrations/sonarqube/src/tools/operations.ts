import { z } from 'zod';
import {
  createClient,
  languageSchema,
  mapLanguage,
  mapQualityGate,
  qualityGateSchema,
  rawRecordSchema,
  readOnlyTool
} from './shared';

export let listQualityGatesTool = readOnlyTool({
  name: 'List Quality Gates',
  key: 'list_quality_gates',
  description:
    'List SonarQube quality gates available to the current token, including the default gate when reported.'
})
  .input(z.object({}))
  .output(
    z.object({
      qualityGates: z.array(qualityGateSchema).describe('SonarQube quality gates.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listQualityGates();
    let qualityGates = result.items.map(mapQualityGate);

    return {
      output: {
        qualityGates
      },
      message: `Found **${qualityGates.length}** SonarQube quality gates.`
    };
  })
  .build();

export let listLanguagesTool = readOnlyTool({
  name: 'List Languages',
  key: 'list_languages',
  description:
    'List programming languages known to SonarQube, optionally filtered by search text.'
})
  .input(
    z.object({
      query: z.string().optional().describe('Search text for language key or name.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of languages to return. Use 0 or omit to return all languages.')
    })
  )
  .output(
    z.object({
      languages: z.array(languageSchema).describe('SonarQube languages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listLanguages(ctx.input);
    let languages = result.items.map(mapLanguage);

    return {
      output: {
        languages
      },
      message: `Found **${languages.length}** SonarQube languages.`
    };
  })
  .build();

export let getSystemStatusTool = readOnlyTool({
  name: 'Get System Status',
  key: 'get_system_status',
  description:
    'Get SonarQube Server system status. This tool is Server-only and returns a ServiceError for SonarQube Cloud configs.'
})
  .input(z.object({}))
  .output(
    z.object({
      id: z.string().optional().describe('SonarQube Server system id.'),
      version: z.string().optional().describe('SonarQube Server version.'),
      status: z.string().optional().describe('SonarQube Server system status.'),
      raw: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getSystemStatus();

    return {
      output: {
        id: typeof data.id === 'string' ? data.id : undefined,
        version: typeof data.version === 'string' ? data.version : undefined,
        status: typeof data.status === 'string' ? data.status : undefined,
        raw: data
      },
      message: `SonarQube Server system status is **${typeof data.status === 'string' ? data.status : 'unknown'}**.`
    };
  })
  .build();
