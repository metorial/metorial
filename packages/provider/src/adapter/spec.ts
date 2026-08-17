import { type SlateActionParameters, SlateTool, SlateTrigger } from '../action';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from '../specification/specification';
import { SlateAdapter } from './adapter';

export interface SlateAdapterCapability {
  id: string;
  value: any;
}

export interface SlateAdapterSpecParameters {
  id: string;
  name: string;
  capabilities?: SlateAdapterCapability[];
}

export class SlateAdapterSpec {
  private constructor(
    private readonly _params: {
      id: string;
      name: string;
      capabilities: SlateAdapterCapability[];
    }
  ) {}

  static create(params: SlateAdapterSpecParameters): SlateAdapterSpec {
    let id = params.id?.trim();
    let name = params.name?.trim();

    if (!id) {
      throw new SlateDeclarationError('Adapter id must be a non-empty string');
    }
    if (!name) {
      throw new SlateDeclarationError('Adapter name must be a non-empty string');
    }

    return new SlateAdapterSpec({
      id,
      name,
      capabilities: validateCapabilities(params.capabilities ?? [])
    });
  }

  get id() {
    return this._params.id;
  }

  get name() {
    return this._params.name;
  }

  get capabilities() {
    return this._params.capabilities;
  }

  get parameters() {
    return this._params;
  }

  tool<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateActionParameters
  ) {
    return SlateTool.create(spec, this.linkAction(params));
  }

  trigger<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateActionParameters
  ) {
    return SlateTrigger.create(spec, this.linkAction(params));
  }

  register<ConfigType extends {}, AuthType extends {}>(params: {
    tools: SlateTool<ConfigType, AuthType, any, any>[];
    triggers: SlateTrigger<ConfigType, AuthType, any, any>[];
  }): SlateAdapter<ConfigType, AuthType> {
    let actions = [...params.tools, ...params.triggers];
    let seenKeys = new Set<string>();

    for (let action of actions) {
      if (action.adapter && action.adapter !== this.id) {
        throw new SlateDeclarationError(
          `Action "${action.key}" is linked to adapter "${action.adapter}", not "${this.id}"`
        );
      }

      if (!action.adapter) {
        throw new SlateDeclarationError(
          `Action "${action.key}" must be created with this adapter's tool() or trigger() helpers`
        );
      }

      if (seenKeys.has(action.key)) {
        throw new SlateDeclarationError(
          `Adapter "${this.id}" already has an action with key "${action.key}"`
        );
      }

      seenKeys.add(action.key);
    }

    return new SlateAdapter(this, params.tools, params.triggers);
  }

  private linkAction(params: SlateActionParameters): SlateActionParameters {
    if (params.adapter != null && params.adapter !== this.id) {
      throw new SlateDeclarationError(
        `Action "${params.key}" cannot be linked to adapter "${this.id}" because it is already linked to "${params.adapter}"`
      );
    }

    return {
      ...params,
      adapter: this.id
    };
  }
}

export let adapterSpec = (params: SlateAdapterSpecParameters) =>
  SlateAdapterSpec.create(params);

let validateCapabilities = (capabilities: SlateAdapterCapability[]) => {
  let seenIds = new Set<string>();

  return capabilities.map(capability => {
    let id = capability.id?.trim();
    if (!id) {
      throw new SlateDeclarationError('Adapter capability ids must be non-empty strings');
    }
    if (seenIds.has(id)) {
      throw new SlateDeclarationError(`Adapter capability "${id}" is defined more than once`);
    }

    seenIds.add(id);

    return {
      id,
      value: capability.value
    };
  });
};
