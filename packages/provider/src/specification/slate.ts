import type { SlateTool, SlateTrigger } from '../action';
import type { SlateSpecification } from './specification';

export class Slate<ConfigType extends {}, AuthType extends {}> {
  private constructor(
    private readonly _spec: SlateSpecification<ConfigType, AuthType>,
    private readonly _actions: (
      | SlateTrigger<ConfigType, AuthType, any, any>
      | SlateTool<ConfigType, AuthType, any, any>
    )[]
  ) {}

  static create<ConfigType extends {}, AuthType extends {}>(params: {
    spec: SlateSpecification<ConfigType, AuthType>;
    triggers: SlateTrigger<ConfigType, AuthType, any, any>[];
    tools: SlateTool<ConfigType, AuthType, any, any>[];
  }) {
    return new Slate(params.spec, [...params.triggers, ...params.tools]);
  }

  get spec() {
    return this._spec;
  }

  get actions() {
    return this._actions;
  }
}
