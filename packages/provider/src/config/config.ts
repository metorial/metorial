import { metrics } from '@opentelemetry/api';
import {
  canonicalSlateConfigJson,
  computeSlateConfigSchemaV2Hash,
  type SlateConfigSchemaWireV2
} from '@slates/proto';
import z from 'zod';
import type { SlateConfigDocsReference } from '../docs';

export type SlateConfigFieldVisibility = 'plain' | 'secret';
export type SlateConfigFieldLifecycle = 'none' | 'projection' | 'reregister' | 'renew';

export interface SlateConfigV2Field<Schema extends z.ZodType = z.ZodType> {
  schema: Schema;
  visibility: SlateConfigFieldVisibility;
  lifecycle: SlateConfigFieldLifecycle;
}

export type SlateConfigV2Fields = Record<string, SlateConfigV2Field>;

export type { SlateConfigSchemaWireV2 } from '@slates/proto';

let configV1CompatibilityCounter = metrics
  .getMeter('@slates/provider')
  .createCounter('slates.provider.config_v1_compatibility.uses', {
    description: 'Use of the temporary config v1 compatibility path',
    unit: '1'
  });

export interface SlateConfigSchemaWireV1Compatibility {
  version: 1;
  jsonSchema: Record<string, unknown>;
  compatibility: {
    integrationId: 'looker' | 'tableau';
    owner: string;
    expiresAt: string;
    cutoffAt: string;
  };
}

let deepFreezeJson = <Value>(value: Value): Value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (let child of Object.values(value as Record<string, unknown>)) deepFreezeJson(child);
    Object.freeze(value);
  }
  return value;
};

export let toSlateConfigJsonSchema = (schema: z.ZodType) =>
  schema.toJSONSchema({
    unrepresentable: 'any',
    override: ctx => {
      let def = ctx.zodSchema._zod.def;
      if (def.type === 'date') {
        ctx.jsonSchema.type = 'string';
        ctx.jsonSchema.format = 'date-time';
      }
      if (def.type === 'bigint') ctx.jsonSchema.type = 'number';
    }
  }) as Record<string, unknown>;

type OptionalConfigFieldKeys<Fields extends SlateConfigV2Fields> = {
  [Key in keyof Fields]: undefined extends z.infer<Fields[Key]['schema']> ? Key : never;
}[keyof Fields];

type InferConfigFields<Fields extends SlateConfigV2Fields> = {
  [Key in Exclude<keyof Fields, OptionalConfigFieldKeys<Fields>>]: z.infer<
    Fields[Key]['schema']
  >;
} & {
  [Key in OptionalConfigFieldKeys<Fields>]?: z.infer<Fields[Key]['schema']>;
};

export type InferSlateConfig<Config> = Config extends SlateConfig<infer Value> ? Value : never;

export class SlateConfig<ConfigType extends {}> {
  #configSchema: z.ZodType<ConfigType>;
  #providerConfigSchema: z.ZodType;
  #wireSchema: SlateConfigSchemaWireV2 | SlateConfigSchemaWireV1Compatibility | null;
  #docs: SlateConfigDocsReference[] | undefined;
  #configChanged:
    | ((params: {
        previousConfig: ConfigType | null;
        newConfig: ConfigType;
      }) => { config: ConfigType | undefined } | undefined)
    | null = null;
  #getDefaultConfig: (() => ConfigType) | null = null;

  private constructor(
    schema: z.ZodType<ConfigType>,
    wireSchema: SlateConfigSchemaWireV2 | SlateConfigSchemaWireV1Compatibility | null = null,
    providerConfigSchema: z.ZodType = schema
  ) {
    this.#configSchema = schema;
    this.#wireSchema = wireSchema ? deepFreezeJson(wireSchema) : null;
    this.#providerConfigSchema = providerConfigSchema;
  }

  static create<ConfigType extends {}>(
    schema: z.ZodType<ConfigType>,
    wireSchema: SlateConfigSchemaWireV2 | SlateConfigSchemaWireV1Compatibility | null = null,
    providerConfigSchema: z.ZodType = schema
  ) {
    return new SlateConfig<ConfigType>(schema, wireSchema, providerConfigSchema);
  }

  config<NewConfigType extends {}>(
    schema: z.ZodType<NewConfigType>
  ): SlateConfig<NewConfigType> {
    if (this.#wireSchema?.version === 2) {
      throw new Error(
        'configV2 schemas are immutable; declare every field in configV2.fields'
      );
    }
    this.#configSchema = schema as any;
    return this as any as SlateConfig<NewConfigType>;
  }

  docs(docs: SlateConfigDocsReference[]): SlateConfig<ConfigType> {
    this.#docs = docs;
    return this;
  }

  onConfigChanged(
    handler: (params: {
      previousConfig: ConfigType | null;
      newConfig: ConfigType;
    }) => { config: ConfigType | undefined } | undefined
  ): SlateConfig<ConfigType> {
    this.#configChanged = handler;
    return this;
  }

  getDefaultConfig(getter: () => ConfigType): SlateConfig<ConfigType> {
    this.#getDefaultConfig = getter;
    return this;
  }

  get configSchema() {
    return this.#configSchema;
  }

  get wireSchema() {
    return this.#wireSchema;
  }

  get providerConfigSchema() {
    return this.#providerConfigSchema;
  }

  get docsReferences() {
    return this.#docs;
  }

  get handlers() {
    return {
      configChanged: this.#configChanged,
      getDefaultConfig: this.#getDefaultConfig
    };
  }
}

export let config = <ConfigType extends {}>(schema: z.ZodType<ConfigType>) =>
  SlateConfig.create<ConfigType>(schema);

/**
 * The sole v2 declaration form. Its literal object shape is deliberately simple enough for the
 * release audit to verify without executing integration code.
 */
export let configV2 = <Fields extends SlateConfigV2Fields>(d: {
  fields: Fields;
}): SlateConfig<InferConfigFields<Fields>> => {
  let fieldOrder = Object.keys(d.fields).sort();
  let fields = Object.fromEntries(
    fieldOrder.map(key => {
      let field = d.fields[key]!;
      if (!['plain', 'secret'].includes(field.visibility)) {
        throw new Error(`Config field ${key} has invalid visibility`);
      }
      if (!['none', 'projection', 'reregister', 'renew'].includes(field.lifecycle)) {
        throw new Error(`Config field ${key} has invalid lifecycle`);
      }
      return [
        key,
        {
          visibility: field.visibility,
          lifecycle: field.lifecycle
        }
      ];
    })
  ) as SlateConfigSchemaWireV2['fields'];
  let shape = Object.fromEntries(
    fieldOrder.map(key => [key, d.fields[key]!.schema])
  ) as z.ZodRawShape;
  let fullSchema = z.strictObject(shape);
  let jsonSchema = toSlateConfigJsonSchema(fullSchema);
  let hash = computeSlateConfigSchemaV2Hash({ version: 2, fieldOrder, fields, jsonSchema });
  let providerShape = Object.fromEntries(
    fieldOrder.map(key => [
      key,
      d.fields[key]!.visibility === 'plain'
        ? d.fields[key]!.schema
        : z.strictObject({ configured: z.boolean() }).optional()
    ])
  ) as z.ZodRawShape;
  return SlateConfig.create(
    fullSchema,
    deepFreezeJson({ version: 2, hash, fieldOrder, fields, jsonSchema }),
    z.strictObject(providerShape)
  ) as SlateConfig<InferConfigFields<Fields>>;
};

export let configV1Compatibility = <ConfigType extends {}>(d: {
  schema: z.ZodType<ConfigType>;
  compatibility: SlateConfigSchemaWireV1Compatibility['compatibility'];
}) => {
  if (!['looker', 'tableau'].includes(d.compatibility.integrationId)) {
    throw new Error('Only Looker and Tableau may use config v1 compatibility');
  }
  if (
    Date.now() >= new Date(d.compatibility.cutoffAt).getTime() ||
    Date.now() >= new Date(d.compatibility.expiresAt).getTime()
  ) {
    throw new Error('Config v1 compatibility cutoff has expired');
  }
  configV1CompatibilityCounter.add(1, {
    'slates.integration.id': d.compatibility.integrationId,
    'slates.config.schema.version': 1
  });
  return SlateConfig.create(d.schema, {
    version: 1,
    jsonSchema: toSlateConfigJsonSchema(d.schema),
    compatibility: d.compatibility
  }) as SlateConfig<ConfigType>;
};

export let __configInternals = {
  canonicalJson: canonicalSlateConfigJson,
  configSchemaHash: computeSlateConfigSchemaV2Hash,
  deepFreezeJson
};
