import type { SlateTool, SlateTrigger } from '../action';
import type { SlateAdapter } from '../adapter';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from './specification';

export class Slate<ConfigType extends {}, AuthType extends {}> {
  private constructor(
    private readonly _spec: SlateSpecification<ConfigType, AuthType>,
    private readonly _actions: (
      | SlateTrigger<ConfigType, AuthType, any, any>
      | SlateTool<ConfigType, AuthType, any, any>
    )[],
    private readonly _adapters: SlateAdapter<ConfigType, AuthType>[]
  ) {}

  static create<ConfigType extends {}, AuthType extends {}>(params: {
    spec: SlateSpecification<ConfigType, AuthType>;
    triggers: SlateTrigger<ConfigType, AuthType, any, any>[];
    tools: SlateTool<ConfigType, AuthType, any, any>[];
    adapters?: SlateAdapter<ConfigType, AuthType>[];
  }) {
    let adapters = params.adapters ?? [];
    let actions = [...params.triggers, ...params.tools];
    let seenAdapterIds = new Set<string>();
    let seenActionKeys = new Map(actions.map(action => [action.key, action]));

    for (let adapter of adapters) {
      if (seenAdapterIds.has(adapter.id)) {
        throw new SlateDeclarationError(
          `Adapter "${adapter.id}" is registered more than once`
        );
      }
      seenAdapterIds.add(adapter.id);

      for (let action of adapter.actions) {
        let existing = seenActionKeys.get(action.key);
        if (existing && existing !== action) {
          throw new SlateDeclarationError(
            `Adapter "${adapter.id}" action "${action.key}" conflicts with another action`
          );
        }

        if (!existing) {
          actions.push(action);
          seenActionKeys.set(action.key, action);
        }
      }
    }

    return new Slate(params.spec, actions, adapters);
  }

  get spec() {
    return this._spec;
  }

  get actions() {
    return this._actions;
  }

  get adapters() {
    return this._adapters;
  }
}
