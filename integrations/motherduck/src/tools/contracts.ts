import { z } from 'zod';
import type { MotherDuckToolContract } from './factory';

let uuid = z.string().uuid();
let empty = z.object({});
let readOnly = { readOnly: true } as const;
let destructive = { destructive: true } as const;
let stringMap = z.record(z.string(), z.string());
let nullableString = z.string().nullable();

let response = <Shape extends z.ZodRawShape>(shape: Shape) =>
  z.looseObject({
    success: z.boolean(),
    ...shape,
    error: z.string().optional()
  });

let textResponse = z.looseObject({
  text: z.string().optional(),
  success: z.boolean().optional(),
  error: z.string().optional()
});

let queryResponse = response({
  columns: z.array(z.string()).optional(),
  columnTypes: z.array(z.string()).optional(),
  rows: z.array(z.array(z.unknown())).optional(),
  rowCount: z.number().int().optional(),
  errorType: z.string().optional()
});

let validationError = z.object({
  type: z.string(),
  message: z.string(),
  details: z.string()
});

let diveMutationResponse = response({
  dive: z
    .looseObject({
      id: z.string(),
      title: z.string().optional(),
      description: nullableString.optional()
    })
    .optional(),
  dive_url: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  database_warnings: z.array(z.string()).optional(),
  unshared_databases: z.array(z.string()).optional(),
  next_steps: z.array(z.string()).optional(),
  validationErrors: z.array(validationError).optional()
});

let flightSummary = z.looseObject({
  id: z.string(),
  name: z.string(),
  schedule_cron: nullableString.optional(),
  current_version: z.number().int()
});

let flightRun = z.looseObject({
  run_id: z.string(),
  flight_id: z.string(),
  flight_name: z.string(),
  flight_version: z.number().int(),
  config: z.record(z.string(), z.unknown()),
  run_number: z.number().int(),
  is_scheduled: z.boolean(),
  status: z.string(),
  created_at: z.string(),
  started_at: nullableString,
  ended_at: nullableString,
  scheduled_at: z.string(),
  cancelled_at: nullableString,
  exit_code: z.number().int().nullable()
});

let guide = z.looseObject({
  id: z.string(),
  topic: nullableString,
  title: z.string(),
  description: z.string(),
  access: z.string(),
  current_version: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
  version_change_comment: z.string().optional(),
  version_external_id: z.string().optional(),
  version_created_at: z.string().optional(),
  references: z.array(z.unknown()).optional()
});

let guideMutationResponse = response({ guide: guide.optional() });

let edit = z
  .object({
    old_string: z.string().min(1).describe('Exact non-empty text to find'),
    new_string: z.string().describe('Replacement text'),
    replace_all: z.boolean().optional().describe('Replace every occurrence; defaults to false')
  })
  .refine(value => value.old_string !== value.new_string, {
    message: 'new_string must differ from old_string',
    path: ['new_string']
  });

let guideTopic = z
  .string()
  .regex(
    /^[^/](?:.*[^/])?$/,
    'Use a slash-separated topic without leading or trailing slashes'
  );

let clearedOrGuideTopic = z.union([z.literal(''), guideTopic]);

let guideReference = z.union([
  z
    .object({
      type: z.literal('catalog'),
      url: z.string().min(1).describe('MotherDuck database or share URL'),
      schema: z.string().optional().describe('Required when table, view, or macro is set'),
      table: z.string().optional(),
      column: z.string().optional().describe('Column name; requires table'),
      view: z.string().optional(),
      macro: z.string().optional(),
      description: z.string().optional().describe('Why this reference exists')
    })
    .refine(value => !value.column || Boolean(value.table), {
      message: 'column requires table',
      path: ['column']
    })
    .refine(
      value =>
        !(value.table || value.view || value.macro) ||
        (Boolean(value.schema) &&
          [value.table, value.view, value.macro].filter(Boolean).length === 1),
      {
        message: 'Catalog objects require schema and exactly one of table, view, or macro',
        path: ['schema']
      }
    ),
  z.object({
    type: z.enum(['dive', 'flight', 'guide']),
    uuid: uuid.describe('Referenced Dive, Flight, or Guide UUID'),
    description: z.string().optional().describe('Why this reference exists')
  })
]);

export let motherDuckToolContracts: MotherDuckToolContract[] = [
  {
    key: 'get_current_user',
    name: 'Get Current User',
    description: 'Get the authenticated MotherDuck user, organization, and account region.',
    inputSchema: empty,
    outputSchema: response({
      user: z
        .object({
          id: z.string(),
          username: z.string(),
          organization_id: nullableString,
          organization_name: nullableString,
          region: z.string()
        })
        .optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_columns',
    name: 'List Columns',
    description: 'List columns of a table or view with types and comments.',
    inputSchema: z.object({
      table: z.string().describe('Table or view name'),
      database: z.string().describe('Database name'),
      schema: z.string().optional().describe('Schema name; defaults to main')
    }),
    outputSchema: response({
      database: z.string().optional(),
      schema: z.string().optional(),
      table: z.string().optional(),
      objectType: z.enum(['table', 'view']).optional(),
      columns: z
        .array(
          z.object({
            name: z.string(),
            type: z.string(),
            nullable: z.boolean(),
            comment: nullableString
          })
        )
        .optional(),
      columnCount: z.number().int().optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_databases',
    name: 'List Databases',
    description: 'List all databases in your MotherDuck account.',
    inputSchema: empty,
    outputSchema: response({
      databases: z
        .array(z.object({ alias: z.string(), is_attached: z.boolean(), type: z.string() }))
        .optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_macros',
    name: 'List Macros',
    description:
      'List table and scalar macros in a MotherDuck database with their parameters.',
    inputSchema: z.object({
      database: z.string().describe('Database name to list macros from'),
      schema: z.string().optional().describe('Schema name; defaults to all schemas'),
      keywords: z
        .string()
        .optional()
        .describe('Case-insensitive name filter; any word can match'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum results; defaults to 100')
    }),
    outputSchema: response({
      database: z.string().optional(),
      schema: z.string().optional(),
      macros: z
        .array(
          z.object({
            schema: z.string(),
            name: z.string(),
            type: z.string(),
            parameters: z.array(z.string())
          })
        )
        .optional(),
      count: z.number().int().optional(),
      totalCount: z.number().int().optional(),
      truncated: z.boolean().optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_shares',
    name: 'List Shares',
    description: 'List database shares that have been shared with you.',
    inputSchema: empty,
    outputSchema: response({
      shares: z.array(z.object({ name: z.string(), url: z.string() })).optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_tables',
    name: 'List Tables',
    description: 'List tables and views in a MotherDuck database.',
    inputSchema: z.object({
      database: z.string().describe('Database name to list tables from'),
      schema: z.string().optional().describe('Schema name; defaults to all schemas')
    }),
    outputSchema: response({
      database: z.string().optional(),
      schema: z.string().optional(),
      tables: z
        .array(
          z.object({
            schema: z.string(),
            name: z.string(),
            type: z.enum(['table', 'view']),
            comment: nullableString
          })
        )
        .optional(),
      tableCount: z.number().int().optional(),
      viewCount: z.number().int().optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_views',
    name: 'List Views',
    description: 'List views in a MotherDuck database with schema, comment, and column count.',
    inputSchema: z.object({
      database: z.string().describe('Database name to list views from'),
      schema: z.string().optional().describe('Schema name; defaults to all schemas'),
      keywords: z
        .string()
        .optional()
        .describe('Case-insensitive name or comment filter; any word can match'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum results; defaults to 100')
    }),
    outputSchema: response({
      database: z.string().optional(),
      schema: z.string().optional(),
      views: z
        .array(
          z.object({
            schema: z.string(),
            name: z.string(),
            comment: nullableString,
            column_count: z.number().int()
          })
        )
        .optional(),
      count: z.number().int().optional(),
      totalCount: z.number().int().optional(),
      truncated: z.boolean().optional()
    }),
    tags: readOnly
  },
  {
    key: 'query',
    name: 'Query',
    description: 'Execute read-only SQL queries against MotherDuck databases.',
    inputSchema: z.object({
      database: z.string().describe('Database name to query'),
      sql: z.string().describe('DuckDB SQL query to execute')
    }),
    outputSchema: queryResponse,
    tags: readOnly
  },
  {
    key: 'query_rw',
    name: 'Query Read Write',
    description: 'Execute SQL queries that can modify data or schema in MotherDuck.',
    inputSchema: z.object({
      database: z
        .string()
        .optional()
        .describe('Database context; required when the statement targets database objects'),
      sql: z.string().describe('DuckDB SQL statement to execute')
    }),
    outputSchema: queryResponse,
    tags: destructive
  },
  {
    key: 'search_catalog',
    name: 'Search Catalog',
    description: 'Fuzzy search across databases, schemas, tables, columns, and shares.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('Search term; supports partial matching, underscores, and dots'),
      object_types: z
        .array(z.enum(['database', 'schema', 'table', 'column', 'share']))
        .optional()
        .describe('Object types to include')
    }),
    outputSchema: response({
      query: z.string().optional(),
      resultCount: z.number().int().optional(),
      results: z
        .array(
          z.object({
            type: z.enum(['database', 'schema', 'table', 'column', 'share']),
            name: z.string(),
            fullyQualifiedName: z.string(),
            database: nullableString,
            schema: nullableString,
            table: nullableString,
            dataType: nullableString,
            comment: nullableString,
            relevanceScore: z.number()
          })
        )
        .optional(),
      errorType: z.string().optional()
    }),
    tags: readOnly
  },
  {
    key: 'delete_dive',
    name: 'Delete Dive',
    description: 'Permanently delete a Dive by ID.',
    inputSchema: z.object({ id: uuid.describe('Dive UUID') }),
    outputSchema: response({ message: z.string().optional() }),
    tags: destructive
  },
  {
    key: 'list_dives',
    name: 'List Dives',
    description: 'List all Dives in your MotherDuck workspace.',
    inputSchema: z.object({
      keywords: z.string().optional().describe('Filter titles and descriptions by all words'),
      include_archived: z
        .boolean()
        .optional()
        .describe('Include archived Dives; defaults to false')
    }),
    outputSchema: response({
      dives: z
        .array(
          z.looseObject({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            owner_name: z.string(),
            current_version: z.number().int(),
            created_at: z.string(),
            updated_at: z.string(),
            status: z.string(),
            status_changed_at: nullableString,
            status_applies_to_version: z.number().int().nullable()
          })
        )
        .optional(),
      count: z.number().int().optional(),
      totalCount: z.number().int().optional(),
      truncated: z.boolean().optional(),
      message: z.string().optional()
    }),
    tags: readOnly
  },
  {
    key: 'read_dive',
    name: 'Read Dive',
    description: 'Read a specific Dive by ID, including its full component code.',
    inputSchema: z.object({
      id: uuid.describe('Dive UUID'),
      version: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Version number; defaults to latest')
    }),
    outputSchema: response({
      dive: z
        .looseObject({
          id: z.string(),
          title: z.string(),
          description: z.string(),
          content: z.string(),
          current_version: z.number().int(),
          created_at: z.string(),
          updated_at: z.string(),
          status: z.string(),
          status_changed_at: nullableString,
          status_applies_to_version: z.number().int().nullable()
        })
        .optional()
    }),
    tags: readOnly
  },
  {
    key: 'save_dive',
    name: 'Save Dive',
    description: 'Save a new Dive to your MotherDuck workspace.',
    inputSchema: z.object({
      title: z.string().describe('Dive title'),
      description: z.string().optional().describe('Brief Dive description'),
      content: z.string().describe('JSX/React component code')
    }),
    outputSchema: diveMutationResponse,
    tags: destructive
  },
  {
    key: 'update_dive',
    name: 'Update Dive',
    description: "Update an existing Dive's title, description, or content.",
    inputSchema: z
      .object({
        id: uuid.describe('Dive UUID'),
        title: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional().describe('JSX/React component code')
      })
      .refine(
        value =>
          value.title !== undefined ||
          value.description !== undefined ||
          value.content !== undefined,
        { message: 'Provide at least one of title, description, or content' }
      ),
    outputSchema: diveMutationResponse,
    tags: destructive
  },
  {
    key: 'view_dive',
    name: 'View Dive',
    description:
      "Load a Dive's source, preview inputs, and MotherDuck app link for a live preview.",
    inputSchema: z.object({
      dive_id: uuid.describe('Dive UUID'),
      required_resources: z
        .array(z.object({ url: z.string(), alias: z.string().optional() }))
        .optional()
        .describe("Override the Dive's declared database resources"),
      initial_state: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON-serializable initial UI state')
    }),
    outputSchema: response({
      dive_id: z.string().optional(),
      title: z.string().optional(),
      source: z.string().optional(),
      current_version: z.number().int().optional(),
      dive_app_url: z.string().optional(),
      initial_state: z.record(z.string(), z.unknown()).optional(),
      required_resources: z.array(z.unknown()).optional()
    }),
    tags: readOnly
  },
  {
    key: 'cancel_flight_run',
    name: 'Cancel Flight Run',
    description: 'Cancel an in-progress Flight run.',
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      run_number: z.number().int().min(1).describe('Sequential run number')
    }),
    outputSchema: response({ canceled: z.boolean().optional() }),
    tags: destructive
  },
  {
    key: 'create_flight',
    name: 'Create Flight',
    description:
      'Create a new Flight from Python source code, requirements, and an optional schedule.',
    inputSchema: z.object({
      name: z.string().describe('Flight name'),
      source_code: z.string().describe('Single-file Python program'),
      md_token_name: z.string().optional().describe('MotherDuck access token label'),
      schedule_cron: z.string().optional().describe('Five-field UTC cron expression'),
      requirements_txt: z
        .string()
        .optional()
        .describe('Pinned Python requirements, one per line'),
      config: stringMap.optional().describe('Non-secret environment variables'),
      md_secret_names: z.array(z.string()).optional().describe('Flight secret names')
    }),
    outputSchema: response({ flight: flightSummary.optional() }),
    tags: destructive
  },
  {
    key: 'delete_flight',
    name: 'Delete Flight',
    description: 'Permanently delete a Flight, its versions, schedule, and run history.',
    inputSchema: z.object({ id: uuid.describe('Flight UUID') }),
    outputSchema: response({}),
    tags: destructive
  },
  {
    key: 'edit_flight_source',
    name: 'Edit Flight Source',
    description:
      "Edit a Flight's source code with find-and-replace operations, producing a new version.",
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      edits: z.array(edit).min(1).describe('Edits to apply in sequence')
    }),
    outputSchema: response({
      flight: z
        .object({ id: z.string(), name: z.string(), current_version: z.number().int() })
        .optional()
    }),
    tags: destructive
  },
  {
    key: 'get_flight_run_logs',
    name: 'Get Flight Run Logs',
    description: 'Fetch the logs and run record for a single Flight run.',
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      run_number: z.number().int().min(1).describe('Sequential run number'),
      max_bytes: z
        .number()
        .int()
        .min(1024)
        .optional()
        .describe('Maximum log bytes; truncation returns the tail')
    }),
    outputSchema: response({
      flight_id: z.string().optional(),
      run_number: z.number().int().optional(),
      run: flightRun.optional(),
      logs: z.string().optional(),
      truncated: z.boolean().optional(),
      original_length: z.number().int().optional()
    }),
    tags: readOnly
  },
  {
    key: 'get_flight',
    name: 'Get Flight',
    description:
      "Fetch a Flight's metadata and version snapshot, optionally at a historical version.",
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      version: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Version number; defaults to current')
    }),
    outputSchema: response({
      flight: z
        .looseObject({
          flight_id: z.string(),
          flight_name: z.string(),
          created_at: z.string(),
          updated_at: z.string(),
          schedule_cron: nullableString,
          status: z.string(),
          schedule_status: nullableString,
          current_version: z.number().int(),
          owner_name: nullableString,
          version_info: z.looseObject({
            version_id: z.string(),
            flight_id: z.string(),
            version: z.number().int(),
            created_at: z.string(),
            source_code: z.string(),
            requirements_txt: nullableString,
            config: stringMap,
            access_token_name: z.string(),
            flight_secret_names: z.array(z.string()),
            max_runtime_sec: z.number().int()
          })
        })
        .optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_flight_runs',
    name: 'List Flight Runs',
    description: 'List the execution history of a Flight, newest first.',
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum results; defaults to 100')
    }),
    outputSchema: response({
      flight_id: z.string().optional(),
      runs: z.array(flightRun).optional(),
      count: z.number().int().optional(),
      totalCount: z.number().int().optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_flight_versions',
    name: 'List Flight Versions',
    description: 'List the version history of a Flight, newest first.',
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe('Maximum results; defaults to 100')
    }),
    outputSchema: response({
      versions: z
        .array(
          z.looseObject({
            version: z.number().int(),
            source_code: z.string(),
            requirements_txt: z.string(),
            md_token_name: z.string(),
            md_secret_names: z.array(z.string()),
            config: stringMap,
            created_at: z.string()
          })
        )
        .optional(),
      count: z.number().int().optional()
    }),
    tags: readOnly
  },
  {
    key: 'list_flights',
    name: 'List Flights',
    description: 'List Flights with summary metadata, optionally filtered by keywords.',
    inputSchema: z.object({
      keywords: z.string().optional().describe('Case-insensitive all-words name filter'),
      owner_only: z.boolean().optional().describe('Restrict the listing to Flights you own'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum results; defaults to 50'),
      offset: z.number().int().min(0).optional().describe('Number of Flights to skip')
    }),
    outputSchema: response({
      flights: z
        .array(
          z.looseObject({
            flight_id: z.string(),
            flight_name: z.string(),
            created_at: z.string(),
            updated_at: z.string(),
            schedule_cron: nullableString,
            status: z.string(),
            schedule_status: nullableString,
            current_version: z.number().int(),
            owner_name: nullableString
          })
        )
        .optional(),
      count: z.number().int().optional(),
      totalCount: z.number().int().optional(),
      truncated: z.boolean().optional(),
      message: z.string().optional()
    }),
    tags: readOnly
  },
  {
    key: 'run_flight',
    name: 'Run Flight',
    description: 'Trigger an on-demand execution of a Flight using its current version.',
    inputSchema: z.object({
      id: uuid.describe('Flight UUID'),
      config: stringMap
        .optional()
        .describe('Per-run overrides for existing configuration keys')
    }),
    outputSchema: response({ run: flightRun.optional() }),
    tags: destructive
  },
  {
    key: 'update_flight',
    name: 'Update Flight',
    description:
      "Update a Flight's source, requirements, config, token, secrets, name, or schedule.",
    inputSchema: z
      .object({
        id: uuid.describe('Flight UUID'),
        name: z.string().optional(),
        schedule_cron: z
          .string()
          .optional()
          .describe('Five-field UTC cron; pass an empty string to clear'),
        source_code: z.string().optional(),
        requirements_txt: z.string().optional(),
        config: stringMap.optional().describe('Replacement configuration map'),
        md_token_name: z.string().optional(),
        md_secret_names: z
          .array(z.string())
          .optional()
          .describe('Replacement secret-name list')
      })
      .refine(
        value =>
          value.name !== undefined ||
          value.schedule_cron !== undefined ||
          value.source_code !== undefined ||
          value.requirements_txt !== undefined ||
          value.config !== undefined ||
          value.md_token_name !== undefined ||
          value.md_secret_names !== undefined,
        { message: 'Provide at least one Flight field to update' }
      ),
    outputSchema: response({ flight: flightSummary.optional() }),
    tags: destructive
  },
  {
    key: 'create_guide',
    name: 'Create Guide',
    description:
      "Create a markdown Guide that AI agents use to answer your organization's data questions.",
    inputSchema: z.object({
      title: z.string().min(1),
      content: z.string().max(1_048_576).describe('Full markdown body'),
      topic: guideTopic
        .optional()
        .describe('Slash-separated grouping label without boundary slashes'),
      description: z.string().optional(),
      access: z.enum(['user', 'organization']).optional().describe('Defaults to user'),
      change_comment: z.string().optional(),
      external_id: z.string().optional(),
      references: z.array(guideReference).min(1).max(5).optional()
    }),
    outputSchema: guideMutationResponse,
    tags: destructive
  },
  {
    key: 'delete_guide',
    name: 'Delete Guide',
    description: 'Soft-delete a Guide while preserving its version history.',
    inputSchema: z.object({ uuid: uuid.describe('Guide UUID') }),
    outputSchema: response({ deleted: z.boolean().optional() }),
    tags: destructive
  },
  {
    key: 'edit_guide_content',
    name: 'Edit Guide Content',
    description: 'Apply targeted string replacements to a Guide and save a versioned update.',
    inputSchema: z.object({
      uuid: uuid.describe('Guide UUID'),
      edits: z.array(edit).min(1),
      change_comment: z.string().optional(),
      external_id: z.string().optional()
    }),
    outputSchema: response({
      guide: guide.optional(),
      edits_applied: z.number().int().optional(),
      total_replacements: z.number().int().optional(),
      hint: z.string().optional()
    }),
    tags: destructive
  },
  {
    key: 'get_guide',
    name: 'Get Guide',
    description:
      "Load a Guide's full content by UUID, optionally pinning a historical version.",
    inputSchema: z.object({
      uuid: uuid.describe('Guide UUID'),
      version: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Version number; defaults to current')
    }),
    outputSchema: textResponse,
    tags: readOnly
  },
  {
    key: 'get_query_guide',
    name: 'Get Query Guide',
    description:
      "Load your organization's query guidance and an overview of available Guides before writing SQL.",
    inputSchema: empty,
    outputSchema: textResponse,
    tags: readOnly
  },
  {
    key: 'list_guides',
    name: 'List Guides',
    description: "Browse your organization's Guides level by level, grouped by topic.",
    inputSchema: z.object({
      topic: guideTopic.optional().describe('Topic path to open; omit for the root level')
    }),
    outputSchema: response({
      topic: z.string().optional(),
      topics: z
        .array(z.object({ topic: z.string(), guide_count: z.number().int() }))
        .optional(),
      guides: z
        .array(
          z.object({
            uuid: z.string(),
            topic: z.string(),
            title: z.string(),
            access: z.string(),
            description: z.string()
          })
        )
        .optional()
    }),
    tags: readOnly
  },
  {
    key: 'set_guide_access',
    name: 'Set Guide Access',
    description: "Change a Guide's visibility between private and organization-wide.",
    inputSchema: z.object({
      uuid: uuid.describe('Guide UUID'),
      access: z.enum(['user', 'organization'])
    }),
    outputSchema: guideMutationResponse,
    tags: destructive
  },
  {
    key: 'update_guide_metadata',
    name: 'Update Guide Metadata',
    description:
      "Change a Guide's title, description, or topic without creating a content version.",
    inputSchema: z
      .object({
        uuid: uuid.describe('Guide UUID'),
        title: z.string().min(1).optional(),
        description: z.string().optional().describe('Pass an empty string to clear'),
        topic: clearedOrGuideTopic.optional().describe('Pass an empty string to clear')
      })
      .refine(
        value =>
          value.title !== undefined ||
          value.description !== undefined ||
          value.topic !== undefined,
        { message: 'Provide at least one of title, description, or topic' }
      ),
    outputSchema: guideMutationResponse,
    tags: destructive
  },
  {
    key: 'update_guide',
    name: 'Update Guide',
    description: 'Append a version to an existing Guide with updated content or references.',
    inputSchema: z.object({
      uuid: uuid.describe('Guide UUID'),
      content: z
        .string()
        .max(1_048_576)
        .optional()
        .describe('Full markdown body; omit to preserve current content'),
      change_comment: z.string().optional(),
      external_id: z.string().optional(),
      references: z
        .array(guideReference)
        .max(5)
        .optional()
        .describe('Replacement references; pass an empty array to clear')
    }),
    outputSchema: guideMutationResponse,
    tags: destructive
  }
];
