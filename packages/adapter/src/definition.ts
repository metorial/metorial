import {
  type SlateActionParameters,
  type SlateAdapterCapability,
  SlateAdapterSpec,
  SlateDeclarationError,
  type SlateSpecification,
  type SlateTool,
  type SlateTrigger
} from '@slates/provider';
import type z from 'zod';
import { SlateAdapterToolDefinition } from './tool';
import { SlateAdapterTriggerDefinition } from './trigger';

export interface SlateAdapterCapabilityRule {
  tools?: readonly string[];
  triggers?: readonly string[];
}

type IsNonEmptyActionList<T> = T extends readonly [string, ...string[]] ? true : false;

type CapabilityRuleIsDerived<Rule> = Rule extends {
  tools?: infer Tools;
  triggers?: infer Triggers;
}
  ? IsNonEmptyActionList<Tools> extends true
    ? true
    : IsNonEmptyActionList<Triggers> extends true
      ? true
      : false
  : false;

export type ImplementationCapabilityKeys<
  Caps extends Record<string, SlateAdapterCapabilityRule>
> = {
  [K in keyof Caps]: CapabilityRuleIsDerived<Caps[K]> extends true ? never : K & string;
}[keyof Caps];

export interface SlateAdapterDefinitionParameters<
  Caps extends Record<string, SlateAdapterCapabilityRule> = Record<
    string,
    SlateAdapterCapabilityRule
  >
> {
  id: string;
  name: string;
  capabilities?: Caps;
}

export class SlateAdapterDefinition<
  Caps extends Record<string, SlateAdapterCapabilityRule> = Record<
    string,
    SlateAdapterCapabilityRule
  >,
  Tools extends Record<string, SlateAdapterToolDefinition<any, any, any, any>> = {},
  Triggers extends Record<string, SlateAdapterTriggerDefinition<any, any, any>> = {}
> {
  #toolDefinitions = new Map<string, SlateAdapterToolDefinition<any, any, boolean, any>>();
  #triggerDefinitions = new Map<string, SlateAdapterTriggerDefinition<any, any, any>>();
  #actionKeys = new Set<string>();
  #linkedTools: Tools = {} as Tools;
  #linkedTriggers: Triggers = {} as Triggers;
  #linkingSpec: SlateAdapterSpec;

  private constructor(
    private readonly _params: {
      id: string;
      name: string;
      capabilities: Caps;
    }
  ) {
    this.#linkingSpec = SlateAdapterSpec.create({
      id: _params.id,
      name: _params.name,
      capabilities: []
    });
  }

  static create<const Caps extends Record<string, SlateAdapterCapabilityRule>>(
    params: SlateAdapterDefinitionParameters<Caps>
  ): SlateAdapterDefinition<Caps> {
    let id = params.id?.trim();
    let name = params.name?.trim();

    if (!id) {
      throw new SlateDeclarationError('Adapter id must be a non-empty string');
    }
    if (!name) {
      throw new SlateDeclarationError('Adapter name must be a non-empty string');
    }

    return new SlateAdapterDefinition({
      id,
      name,
      capabilities: validateCapabilityRules(params.capabilities ?? ({} as Caps))
    });
  }

  get id() {
    return this._params.id;
  }

  get name() {
    return this._params.name;
  }

  get capabilityRules() {
    return this._params.capabilities;
  }

  get tools() {
    return this.#linkedTools;
  }

  get triggers() {
    return this.#linkedTriggers;
  }

  defineTool<Key extends string, InputType extends {}, OutputType extends {}>(
    params: Omit<SlateActionParameters, 'adapter' | 'key'> & {
      key: Key;
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    }
  ): SlateAdapterToolDefinition<InputType, OutputType, false, Key> {
    let key = this.registerActionKey(params.key, 'tool') as Key;
    let definition = new SlateAdapterToolDefinition<InputType, OutputType, false, Key>(this, {
      ...params,
      key
    });
    this.#toolDefinitions.set(key, definition);
    return definition;
  }

  definePublicTool<Key extends string, InputType extends {}, OutputType extends {}>(
    params: Omit<SlateActionParameters, 'adapter' | 'key'> & {
      key: Key;
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    }
  ): SlateAdapterToolDefinition<InputType, OutputType, true, Key> {
    let key = this.registerActionKey(params.key, 'tool') as Key;
    let definition = new SlateAdapterToolDefinition<InputType, OutputType, true, Key>(
      this,
      {
        ...params,
        key
      },
      true
    );
    this.#toolDefinitions.set(key, definition);
    return definition;
  }

  defineTrigger<Key extends string, InputType extends {}, OutputType extends {}>(
    params: Omit<SlateActionParameters, 'adapter' | 'key'> & {
      key: Key;
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    }
  ): SlateAdapterTriggerDefinition<InputType, OutputType, Key> {
    let key = this.registerActionKey(params.key, 'trigger') as Key;
    let definition = new SlateAdapterTriggerDefinition<InputType, OutputType, Key>(this, {
      ...params,
      key
    });
    this.#triggerDefinitions.set(key, definition);
    return definition;
  }

  link<
    TTools extends Record<string, SlateAdapterToolDefinition<any, any, any, any>>,
    TTriggers extends Record<string, SlateAdapterTriggerDefinition<any, any, any>>
  >(catalog: {
    tools: TTools;
    triggers: TTriggers;
  }): SlateAdapterDefinition<Caps, TTools, TTriggers> {
    this.assertCompleteCatalog('tool', this.#toolDefinitions, catalog.tools);
    this.assertCompleteCatalog('trigger', this.#triggerDefinitions, catalog.triggers);
    this.#linkedTools = catalog.tools as any;
    this.#linkedTriggers = catalog.triggers as any;
    return this as any;
  }

  createToolBuilder<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: Omit<SlateActionParameters, 'adapter'>
  ) {
    return this.#linkingSpec.tool(spec, params);
  }

  createPublicToolBuilder<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: Omit<SlateActionParameters, 'adapter'>
  ) {
    return this.#linkingSpec.publicTool(spec, params);
  }

  createTriggerBuilder<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: Omit<SlateActionParameters, 'adapter'>
  ) {
    return this.#linkingSpec.trigger(spec, params);
  }

  register<ConfigType extends {}, AuthType extends {}>(params: {
    tools: SlateTool<ConfigType, AuthType, any, any>[];
    triggers: SlateTrigger<ConfigType, AuthType, any, any>[];
    capabilities?: Partial<Record<ImplementationCapabilityKeys<Caps>, boolean>>;
  }) {
    let implementedToolKeys = new Set<string>();
    let implementedTriggerKeys = new Set<string>();

    for (let tool of params.tools) {
      if (!this.#toolDefinitions.has(tool.key)) {
        throw new SlateDeclarationError(
          `Tool "${tool.key}" is not defined on adapter "${this.id}"`
        );
      }
      implementedToolKeys.add(tool.key);
    }

    for (let trigger of params.triggers) {
      if (!this.#triggerDefinitions.has(trigger.key)) {
        throw new SlateDeclarationError(
          `Trigger "${trigger.key}" is not defined on adapter "${this.id}"`
        );
      }
      implementedTriggerKeys.add(trigger.key);
    }

    return SlateAdapterSpec.create({
      id: this.id,
      name: this.name,
      capabilities: this.deriveCapabilities(
        implementedToolKeys,
        implementedTriggerKeys,
        params.capabilities ?? {}
      )
    }).register(params);
  }

  private assertCompleteCatalog(
    type: 'tool' | 'trigger',
    defined: Map<string, { key: string }>,
    catalog: Record<string, { key: string }>
  ) {
    let catalogKeys = new Set<string>();
    let label = type === 'tool' ? 'Tool' : 'Trigger';

    for (let definition of Object.values(catalog)) {
      if (!defined.has(definition.key) || defined.get(definition.key) !== definition) {
        throw new SlateDeclarationError(
          `${label} "${definition.key}" is not defined on adapter "${this.id}"`
        );
      }
      catalogKeys.add(definition.key);
    }

    for (let key of defined.keys()) {
      if (!catalogKeys.has(key)) {
        throw new SlateDeclarationError(
          `${label} "${key}" is defined on adapter "${this.id}" but was not linked`
        );
      }
    }
  }

  private registerActionKey(key: string, type: 'tool' | 'trigger') {
    let normalized = key?.trim();
    if (!normalized) {
      throw new SlateDeclarationError(`Adapter ${type} key must be a non-empty string`);
    }
    if (this.#actionKeys.has(normalized)) {
      throw new SlateDeclarationError(
        `Adapter "${this.id}" already has an action with key "${normalized}"`
      );
    }

    this.#actionKeys.add(normalized);
    return normalized;
  }

  private deriveCapabilities(
    implementedToolKeys: Set<string>,
    implementedTriggerKeys: Set<string>,
    implementedCapabilities: Partial<Record<string, boolean>>
  ) {
    let capabilities: SlateAdapterCapability[] = [];

    for (let [id, value] of Object.entries(implementedCapabilities)) {
      let rule = this._params.capabilities[id];
      if (!rule) {
        throw new SlateDeclarationError(
          `Capability "${id}" is not defined on adapter "${this.id}"`
        );
      }
      if (!isImplementationCapability(rule)) {
        throw new SlateDeclarationError(
          `Capability "${id}" is derived from tools or triggers and cannot be set by the implementation`
        );
      }
      if (typeof value !== 'boolean') {
        throw new SlateDeclarationError(
          `Capability "${id}" on adapter "${this.id}" must be a boolean`
        );
      }
    }

    for (let [id, rule] of Object.entries(this._params.capabilities)) {
      let toolKeys = rule.tools ?? [];
      let triggerKeys = rule.triggers ?? [];

      for (let key of toolKeys) {
        if (!this.#toolDefinitions.has(key)) {
          throw new SlateDeclarationError(
            `Capability "${id}" references unknown tool "${key}" on adapter "${this.id}"`
          );
        }
      }

      for (let key of triggerKeys) {
        if (!this.#triggerDefinitions.has(key)) {
          throw new SlateDeclarationError(
            `Capability "${id}" references unknown trigger "${key}" on adapter "${this.id}"`
          );
        }
      }

      if (isImplementationCapability(rule)) {
        capabilities.push({
          id,
          value: implementedCapabilities[id] === true
        });
        continue;
      }

      let enabled =
        toolKeys.every(key => implementedToolKeys.has(key)) &&
        triggerKeys.every(key => implementedTriggerKeys.has(key));

      if (enabled) {
        capabilities.push({ id, value: true });
      }
    }

    return capabilities;
  }
}

export let defineAdapter = <const Caps extends Record<string, SlateAdapterCapabilityRule>>(
  params: SlateAdapterDefinitionParameters<Caps>
) => SlateAdapterDefinition.create(params);

let isImplementationCapability = (rule: SlateAdapterCapabilityRule) =>
  (rule.tools?.length ?? 0) === 0 && (rule.triggers?.length ?? 0) === 0;

let validateCapabilityRules = <Caps extends Record<string, SlateAdapterCapabilityRule>>(
  capabilities: Caps
) => {
  let normalized = {} as Caps;

  for (let [rawId, rule] of Object.entries(capabilities)) {
    let id = rawId?.trim();
    if (!id) {
      throw new SlateDeclarationError('Adapter capability ids must be non-empty strings');
    }
    if (normalized[id]) {
      throw new SlateDeclarationError(`Adapter capability "${id}" is defined more than once`);
    }

    let tools = uniqueKeys(rule.tools ?? [], `Capability "${id}" tool`);
    let triggers = uniqueKeys(rule.triggers ?? [], `Capability "${id}" trigger`);

    (normalized as Record<string, SlateAdapterCapabilityRule>)[id] = { tools, triggers };
  }

  return normalized;
};

let uniqueKeys = (keys: readonly string[], label: string) => {
  let seen = new Set<string>();

  return keys.map(key => {
    let normalized = key?.trim();
    if (!normalized) {
      throw new SlateDeclarationError(`${label} keys must be non-empty strings`);
    }
    if (seen.has(normalized)) {
      throw new SlateDeclarationError(`${label} "${normalized}" is referenced more than once`);
    }
    seen.add(normalized);
    return normalized;
  });
};
