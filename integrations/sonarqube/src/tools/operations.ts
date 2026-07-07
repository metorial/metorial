import { z } from 'zod';
import { sonarqubeValidationError } from '../lib/errors';
import { createClient, readOnlyTool } from './shared';

export let listQualityGatesTool = readOnlyTool({
  name: 'List SonarQube Quality Gates',
  key: 'list_quality_gates',
  description: 'List all quality gates.'
})
  .input(z.object({}))
  .output(
    z.object({
      qualityGates: z
        .array(
          z.object({
            id: z.number().int().optional().describe('Quality gate ID'),
            name: z.string().describe('Quality gate name'),
            isDefault: z.boolean().describe('Whether this is the default quality gate'),
            isBuiltIn: z.boolean().describe('Whether this is a built-in quality gate'),
            conditions: z
              .array(
                z.object({
                  metric: z.string().describe('Metric key'),
                  op: z.string().describe('Comparison operator'),
                  error: z.number().int().describe('Error threshold')
                })
              )
              .optional()
              .describe('List of conditions'),
            caycStatus: z.string().optional().describe('Clean as You Code status'),
            hasStandardConditions: z
              .boolean()
              .optional()
              .describe('Whether it has standard conditions'),
            hasMQRConditions: z.boolean().optional().describe('Whether it has MQR conditions'),
            isAiCodeSupported: z.boolean().optional().describe('Whether AI code is supported')
          })
        )
        .describe('List of quality gates')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listQualityGates();
    let qualityGates = result.items.map(gate => {
      let requireString = (value: unknown, field: string) => {
        if (typeof value === 'string') return value;
        throw sonarqubeValidationError(
          `SonarQube quality gate response did not include ${field}.`
        );
      };
      let requireBoolean = (value: unknown, field: string) => {
        if (typeof value === 'boolean') return value;
        throw sonarqubeValidationError(
          `SonarQube quality gate response did not include ${field}.`
        );
      };
      let optionalInteger = (value: unknown) => {
        if (typeof value === 'number' && Number.isInteger(value)) return value;
        return undefined;
      };
      let conditionError = (value: unknown) => {
        if (typeof value === 'number' && Number.isInteger(value)) return value;
        if (typeof value === 'string' && value.trim().length > 0) {
          let parsed = Number(value);
          if (Number.isInteger(parsed)) return parsed;
        }
        return undefined;
      };
      let conditions = Array.isArray(gate.conditions)
        ? gate.conditions.map(condition => {
            if (
              typeof condition !== 'object' ||
              condition === null ||
              Array.isArray(condition)
            ) {
              throw sonarqubeValidationError(
                'SonarQube quality gate response included an invalid condition.'
              );
            }
            let conditionRecord = condition as Record<string, unknown>;
            let error = conditionError(conditionRecord.error);
            if (error === undefined) {
              throw sonarqubeValidationError(
                'SonarQube quality gate response did not include condition error.'
              );
            }

            return {
              metric: requireString(conditionRecord.metric, 'condition metric'),
              op: requireString(conditionRecord.op, 'condition op'),
              error
            };
          })
        : undefined;

      return {
        id: optionalInteger(gate.id),
        name: requireString(gate.name, 'name'),
        isDefault: requireBoolean(gate.isDefault, 'isDefault'),
        isBuiltIn: requireBoolean(gate.isBuiltIn, 'isBuiltIn'),
        conditions,
        caycStatus: typeof gate.caycStatus === 'string' ? gate.caycStatus : undefined,
        hasStandardConditions:
          typeof gate.hasStandardConditions === 'boolean'
            ? gate.hasStandardConditions
            : undefined,
        hasMQRConditions:
          typeof gate.hasMQRConditions === 'boolean' ? gate.hasMQRConditions : undefined,
        isAiCodeSupported:
          typeof gate.isAiCodeSupported === 'boolean' ? gate.isAiCodeSupported : undefined
      };
    });

    return {
      output: {
        qualityGates
      },
      message: `Found **${qualityGates.length}** SonarQube quality gates.`
    };
  })
  .build();

export let listLanguagesTool = readOnlyTool({
  name: 'List SonarQube Supported Languages',
  key: 'list_languages',
  description: 'List all programming languages supported in this instance'
})
  .input(
    z.object({
      q: z
        .string()
        .optional()
        .describe('Optional pattern to match language keys/names against')
    })
  )
  .output(
    z.object({
      languages: z
        .array(
          z.object({
            key: z.string().describe('Language key identifier'),
            name: z.string().describe('Human-readable language name')
          })
        )
        .describe('List of supported programming languages')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listLanguages({ query: ctx.input.q });
    let requireString = (value: unknown, field: string) => {
      if (typeof value === 'string') return value;
      throw sonarqubeValidationError(`SonarQube language response did not include ${field}.`);
    };
    let languages = result.items.map(language => ({
      key: requireString(language.key, 'key'),
      name: requireString(language.name, 'name')
    }));

    return {
      output: {
        languages
      },
      message: `Found **${languages.length}** SonarQube languages.`
    };
  })
  .build();

export let getSystemStatusTool = readOnlyTool({
  name: 'Get SonarQube System Status',
  key: 'get_system_status',
  description:
    'Get state information about SonarQube Server. Returns status (STARTING, UP, DOWN, RESTARTING, DB_MIGRATION_NEEDED, DB_MIGRATION_RUNNING), version, and id.'
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('System status (UP, DOWN, etc.)'),
      description: z.string().describe('Human-readable description of the status'),
      id: z.string().describe('Unique system identifier'),
      version: z.string().describe('SonarQube version')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getSystemStatus();
    let requireString = (value: unknown, field: string) => {
      if (typeof value === 'string') return value;
      throw sonarqubeValidationError(
        `SonarQube system status response did not include ${field}.`
      );
    };
    let status = requireString(data.status, 'status');
    let descriptions: Record<string, string> = {
      STARTING:
        'SonarQube Server Web Server is up and serving some Web Services but initialization is still ongoing',
      UP: 'SonarQube Server instance is up and running',
      DOWN: 'SonarQube Server instance is up but not running because migration has failed or some other reason',
      RESTARTING: 'SonarQube Server instance is still up but a restart has been requested',
      DB_MIGRATION_NEEDED: 'Database migration is required',
      DB_MIGRATION_RUNNING: 'DB migration is running'
    };
    let description = descriptions[status] ?? 'Unknown status';

    return {
      output: {
        status,
        description,
        id: requireString(data.id, 'id'),
        version: requireString(data.version, 'version')
      },
      message: `SonarQube Server system status is **${status}**.`
    };
  })
  .build();
