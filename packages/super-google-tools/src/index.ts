import {
  buildApiServiceError,
  createApiServiceError,
  type Slate,
  type SlateActionScopes,
  type SlateSpecification,
  SlateTool
} from 'slates';

type AnyTool = SlateTool<any, any, any, any>;

export type SuperGoogleToolSource<ConfigType extends {} = Record<string, unknown>> = {
  integration: string;
  provider: Pick<Slate<any, any>, 'actions' | 'spec'>;
  mapConfig?: (aggregateConfig: ConfigType) => Record<string, unknown>;
};

export type SuperGoogleIncludedToolManifestEntry = {
  sourceIntegration: string;
  sourceKey: string;
  status?: 'included';
  exposedKey?: string;
  exposedName?: string;
  instructions?: string[];
  constraints?: string[];
  scopes?: SlateActionScopes;
};

export type SuperGoogleOmittedToolManifestEntry = {
  sourceIntegration: string;
  sourceKey: string;
  status: 'omitted';
  reason: string;
};

export type SuperGoogleToolManifestEntry =
  | SuperGoogleIncludedToolManifestEntry
  | SuperGoogleOmittedToolManifestEntry;

export type SuperGoogleIncludedToolInventoryEntry = {
  sourceIntegration: string;
  sourceKey: string;
  exposedKey: string;
  exposedName: string;
};

export type SuperGoogleRenamedToolInventoryEntry = SuperGoogleIncludedToolInventoryEntry & {
  sourceName: string;
};

export type SuperGoogleOmittedToolInventoryEntry = {
  sourceIntegration: string;
  sourceKey: string;
  reason: string;
};

export type SuperGoogleToolInventory = {
  included: SuperGoogleIncludedToolInventoryEntry[];
  renamed: SuperGoogleRenamedToolInventoryEntry[];
  omitted: SuperGoogleOmittedToolInventoryEntry[];
  sourceToolCount: number;
  importedToolCount: number;
};

export type ImportSuperGoogleToolsParameters<ConfigType extends {}, AuthType extends {}> = {
  spec: SlateSpecification<ConfigType, AuthType>;
  sources: SuperGoogleToolSource<ConfigType>[];
  manifest: SuperGoogleToolManifestEntry[];
  authMethodKey?: string | null;
};

export type ImportSuperGoogleToolsResult<ConfigType extends {}, AuthType extends {}> = {
  tools: SlateTool<ConfigType, AuthType, any, any>[];
  inventory: SuperGoogleToolInventory;
};

let manifestError = (message: string) =>
  createApiServiceError(message, { reason: 'super_google_tool_manifest' });

let getSourceToolId = (sourceIntegration: string, sourceKey: string) =>
  `${sourceIntegration}:${sourceKey}`;

let getSourceTools = (source: SuperGoogleToolSource<any>) => {
  let tools = source.provider.actions.filter(action => action.type === 'tool') as AnyTool[];
  let toolsByKey = new Map<string, AnyTool>();

  for (let tool of tools) {
    if (toolsByKey.has(tool.key)) {
      throw manifestError(
        `Source integration "${source.integration}" exposes duplicate tool key "${tool.key}".`
      );
    }
    toolsByKey.set(tool.key, tool);
  }

  return toolsByKey;
};

let assertValidSources = (sources: SuperGoogleToolSource<any>[]) => {
  let integrations = new Set<string>();

  for (let source of sources) {
    let integration = source.integration.trim();
    if (!integration) {
      throw manifestError('Every source integration must have a non-empty name.');
    }
    if (integrations.has(integration)) {
      throw manifestError(`Source integration "${integration}" is registered more than once.`);
    }
    integrations.add(integration);
  }
};

let withSourceConfig = (ctx: any, sourceConfig: Record<string, unknown>) => {
  let frozenConfig = Object.freeze(sourceConfig);
  return new Proxy(ctx, {
    get(target, property) {
      if (property === 'config') return frozenConfig;

      let value = Reflect.get(target, property, target);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
};

let sourceConfigError = (
  sourceIntegration: string,
  sourceKey: string,
  issues: readonly { path: PropertyKey[]; message: string }[]
) => {
  let details = issues
    .map(issue => {
      let path =
        issue.path.length > 0 ? `config.${issue.path.map(String).join('.')}` : 'config';
      return `${path}: ${issue.message}`;
    })
    .join('; ');

  return createApiServiceError(
    `Invalid configuration for imported source tool "${getSourceToolId(sourceIntegration, sourceKey)}": ${details}`,
    { reason: 'super_google_source_config' }
  );
};

let sourceInvocationError = (error: unknown, sourceIntegration: string, sourceKey: string) =>
  buildApiServiceError(error, {
    providerLabel: `Imported source tool "${getSourceToolId(sourceIntegration, sourceKey)}"`,
    operation: 'invocation',
    reason: 'super_google_source_tool_invocation',
    extractMessage: () => 'The source handler returned an unexpected failure.'
  });

let invokeSourceTool = async (
  sourceTool: AnyTool,
  sourceSpec: SlateSpecification<any, any>,
  ctx: any,
  sourceIntegration: string,
  sourceKey: string,
  mapConfig?: (aggregateConfig: any) => Record<string, unknown>
) => {
  try {
    let config = mapConfig ? mapConfig(ctx.config) : ctx.config;
    let parsedConfig = sourceSpec.configSchema.safeParse(config);
    if (!parsedConfig.success) {
      throw sourceConfigError(sourceIntegration, sourceKey, parsedConfig.error.issues);
    }

    return await sourceTool.handleInvocation(withSourceConfig(ctx, parsedConfig.data));
  } catch (error) {
    throw sourceInvocationError(error, sourceIntegration, sourceKey);
  }
};

let assertValidManifestEntry = (entry: SuperGoogleToolManifestEntry) => {
  if (!entry.sourceIntegration.trim() || !entry.sourceKey.trim()) {
    throw manifestError('Manifest source integration and tool key must be non-empty.');
  }

  if (entry.status === 'omitted' && !entry.reason.trim()) {
    throw manifestError(
      `Omitted source tool "${getSourceToolId(entry.sourceIntegration, entry.sourceKey)}" must include a reason.`
    );
  }
};

export let importSuperGoogleTools = <ConfigType extends {}, AuthType extends {}>({
  spec,
  sources,
  manifest,
  authMethodKey = 'oauth'
}: ImportSuperGoogleToolsParameters<ConfigType, AuthType>): ImportSuperGoogleToolsResult<
  ConfigType,
  AuthType
> => {
  assertValidSources(sources);

  let normalizedAuthMethodKey = authMethodKey?.trim() || null;
  let sourceTools = new Map<string, Map<string, AnyTool>>();
  let sourceSpecs = new Map<string, SlateSpecification<any, any>>();
  let configMappers = new Map<
    string,
    ((aggregateConfig: ConfigType) => Record<string, unknown>) | undefined
  >();
  for (let source of sources) {
    let integration = source.integration.trim();
    sourceTools.set(integration, getSourceTools(source));
    sourceSpecs.set(integration, source.provider.spec);
    configMappers.set(integration, source.mapConfig);
  }

  let seenSourceTools = new Set<string>();
  let seenExposedKeys = new Map<string, string>();
  let tools: SlateTool<ConfigType, AuthType, any, any>[] = [];
  let included: SuperGoogleIncludedToolInventoryEntry[] = [];
  let renamed: SuperGoogleRenamedToolInventoryEntry[] = [];
  let omitted: SuperGoogleOmittedToolInventoryEntry[] = [];

  for (let entry of manifest) {
    assertValidManifestEntry(entry);

    let sourceId = getSourceToolId(entry.sourceIntegration, entry.sourceKey);
    if (seenSourceTools.has(sourceId)) {
      throw manifestError(`Source tool "${sourceId}" appears more than once in the manifest.`);
    }
    seenSourceTools.add(sourceId);

    let integrationTools = sourceTools.get(entry.sourceIntegration);
    if (!integrationTools) {
      throw manifestError(
        `Manifest references source integration "${entry.sourceIntegration}", but no provider was supplied for it.`
      );
    }

    let sourceTool = integrationTools.get(entry.sourceKey);
    if (!sourceTool) {
      throw manifestError(
        `Manifest references missing source tool "${sourceId}". Check the provider export and source key.`
      );
    }

    if (entry.status === 'omitted') {
      omitted.push({
        sourceIntegration: entry.sourceIntegration,
        sourceKey: entry.sourceKey,
        reason: entry.reason
      });
      continue;
    }

    let exposedKey = entry.exposedKey?.trim() || sourceTool.key;
    let exposedName = entry.exposedName?.trim() || sourceTool.name;
    let existingSourceId = seenExposedKeys.get(exposedKey);
    if (existingSourceId) {
      throw manifestError(
        `Aggregate tool key "${exposedKey}" is requested by both "${existingSourceId}" and "${sourceId}". Add an exposedKey alias.`
      );
    }
    seenExposedKeys.set(exposedKey, sourceId);

    let productionId = `${spec.key}-${exposedKey}`;
    if (productionId.length >= 60) {
      throw manifestError(
        `Aggregate tool ID "${productionId}" is ${productionId.length} characters; production tool IDs must be under 60 characters.`
      );
    }

    if (sourceTool.isPublic && normalizedAuthMethodKey) {
      throw manifestError(
        `Source tool "${sourceId}" is public and cannot be rebound to OAuth method "${normalizedAuthMethodKey}".`
      );
    }

    let mapConfig = configMappers.get(entry.sourceIntegration);
    let sourceSpec = sourceSpecs.get(entry.sourceIntegration)!;
    let handleInvocation = async (ctx: any) =>
      invokeSourceTool(
        sourceTool,
        sourceSpec,
        ctx,
        entry.sourceIntegration,
        entry.sourceKey,
        mapConfig
      );
    let clonedTool = SlateTool.fromCreateParameters(spec, {
      ...sourceTool.parameters,
      type: 'tool',
      key: exposedKey,
      name: exposedName,
      instructions: entry.instructions ?? sourceTool.parameters.instructions,
      constraints: entry.constraints ?? sourceTool.parameters.constraints,
      scopes: entry.scopes ?? sourceTool.parameters.scopes,
      authMethods: normalizedAuthMethodKey ? [normalizedAuthMethodKey] : undefined,
      inputSchema: sourceTool.inputSchema,
      outputSchema: sourceTool.outputSchema,
      handleInvocation
    });

    tools.push(clonedTool);
    let inventoryEntry = {
      sourceIntegration: entry.sourceIntegration,
      sourceKey: entry.sourceKey,
      exposedKey,
      exposedName
    };
    included.push(inventoryEntry);

    if (exposedKey !== sourceTool.key || exposedName !== sourceTool.name) {
      renamed.push({ ...inventoryEntry, sourceName: sourceTool.name });
    }
  }

  for (let [sourceIntegration, integrationTools] of sourceTools) {
    for (let sourceKey of integrationTools.keys()) {
      let sourceId = getSourceToolId(sourceIntegration, sourceKey);
      if (!seenSourceTools.has(sourceId)) {
        throw manifestError(
          `Source tool "${sourceId}" is not accounted for by the manifest. Include or explicitly omit it.`
        );
      }
    }
  }

  let sourceToolCount = [...sourceTools.values()].reduce(
    (count, integrationTools) => count + integrationTools.size,
    0
  );

  return {
    tools,
    inventory: {
      included,
      renamed,
      omitted,
      sourceToolCount,
      importedToolCount: tools.length
    }
  };
};
