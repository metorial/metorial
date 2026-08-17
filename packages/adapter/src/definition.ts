import {
  type SlateActionParameters,
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
  tools?: string[];
  triggers?: string[];
}

export interface SlateAdapterDefinitionParameters {
  id: string;
  name: string;
  capabilities?: Record<string, SlateAdapterCapabilityRule>;
}

export class SlateAdapterDefinition {
  #tools = new Map<string, SlateAdapterToolDefinition<any, any>>();
  #triggers = new Map<string, SlateAdapterTriggerDefinition<any, any>>();
  #actionKeys = new Set<string>();
  #linkingSpec: SlateAdapterSpec;

  private constructor(
    private readonly _params: {
      id: string;
      name: string;
      capabilities: Record<string, SlateAdapterCapabilityRule>;
    }
  ) {
    this.#linkingSpec = SlateAdapterSpec.create({
      id: _params.id,
      name: _params.name,
      capabilities: []
    });
  }

  static create(params: SlateAdapterDefinitionParameters): SlateAdapterDefinition {
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
      capabilities: validateCapabilityRules(params.capabilities ?? {})
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

  defineTool<InputType extends {}, OutputType extends {}>(
    params: Omit<SlateActionParameters, 'adapter'> & {
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    }
  ): SlateAdapterToolDefinition<InputType, OutputType> {
    let key = this.registerActionKey(params.key, 'tool');
    let definition = new SlateAdapterToolDefinition(this, {
      ...params,
      key
    });
    this.#tools.set(key, definition);
    return definition;
  }

  defineTrigger<InputType extends {}, OutputType extends {}>(
    params: Omit<SlateActionParameters, 'adapter'> & {
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    }
  ): SlateAdapterTriggerDefinition<InputType, OutputType> {
    let key = this.registerActionKey(params.key, 'trigger');
    let definition = new SlateAdapterTriggerDefinition(this, {
      ...params,
      key
    });
    this.#triggers.set(key, definition);
    return definition;
  }

  createToolBuilder<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: Omit<SlateActionParameters, 'adapter'>
  ) {
    return this.#linkingSpec.tool(spec, params);
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
  }) {
    let implementedToolKeys = new Set<string>();
    let implementedTriggerKeys = new Set<string>();

    for (let tool of params.tools) {
      if (!this.#tools.has(tool.key)) {
        throw new SlateDeclarationError(
          `Tool "${tool.key}" is not defined on adapter "${this.id}"`
        );
      }
      implementedToolKeys.add(tool.key);
    }

    for (let trigger of params.triggers) {
      if (!this.#triggers.has(trigger.key)) {
        throw new SlateDeclarationError(
          `Trigger "${trigger.key}" is not defined on adapter "${this.id}"`
        );
      }
      implementedTriggerKeys.add(trigger.key);
    }

    return SlateAdapterSpec.create({
      id: this.id,
      name: this.name,
      capabilities: this.deriveCapabilities(implementedToolKeys, implementedTriggerKeys)
    }).register(params);
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
    implementedTriggerKeys: Set<string>
  ) {
    let capabilities: { id: string; value: true }[] = [];

    for (let [id, rule] of Object.entries(this._params.capabilities)) {
      let toolKeys = rule.tools ?? [];
      let triggerKeys = rule.triggers ?? [];

      for (let key of toolKeys) {
        if (!this.#tools.has(key)) {
          throw new SlateDeclarationError(
            `Capability "${id}" references unknown tool "${key}" on adapter "${this.id}"`
          );
        }
      }

      for (let key of triggerKeys) {
        if (!this.#triggers.has(key)) {
          throw new SlateDeclarationError(
            `Capability "${id}" references unknown trigger "${key}" on adapter "${this.id}"`
          );
        }
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

export let defineAdapter = (params: SlateAdapterDefinitionParameters) =>
  SlateAdapterDefinition.create(params);

let validateCapabilityRules = (capabilities: Record<string, SlateAdapterCapabilityRule>) => {
  let normalized: Record<string, SlateAdapterCapabilityRule> = {};

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

    if (tools.length === 0 && triggers.length === 0) {
      throw new SlateDeclarationError(
        `Adapter capability "${id}" must reference at least one tool or trigger`
      );
    }

    normalized[id] = { tools, triggers };
  }

  return normalized;
};

let uniqueKeys = (keys: string[], label: string) => {
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
