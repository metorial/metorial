import type { SlateTool, SlateTrigger } from '../action';
import type { SlateAdapterSpec } from './spec';

export class SlateAdapter<ConfigType extends {}, AuthType extends {}> {
  constructor(
    private readonly _spec: SlateAdapterSpec,
    private readonly _tools: SlateTool<ConfigType, AuthType, any, any>[],
    private readonly _triggers: SlateTrigger<ConfigType, AuthType, any, any>[]
  ) {}

  get spec() {
    return this._spec;
  }

  get id() {
    return this._spec.id;
  }

  get name() {
    return this._spec.name;
  }

  get capabilities() {
    return this._spec.capabilities;
  }

  get tools() {
    return this._tools;
  }

  get triggers() {
    return this._triggers;
  }

  get actions() {
    return [...this._triggers, ...this._tools];
  }
}
