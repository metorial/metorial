import type { SlateSpecification } from '../specification/specification';
import type { SlateActionParameters, SlatePublicToolInvocationHandler } from './action';
import { SlateActionBuilder } from './builder';
import { SlateTool } from './tool';

export interface SlatePublicToolParameters<InputType extends {}, OutputType extends {}>
  extends SlateActionParameters {
  handleInvocation: SlatePublicToolInvocationHandler<InputType, OutputType>;
}

export class SlatePublicTool {
  private constructor() {}

  static create<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateActionParameters
  ) {
    return new SlateActionBuilder(
      'tool',
      spec,
      params,
      params => {
        return SlateTool.fromCreateParameters(spec, {
          ...params,
          isPublic: true
        });
      },
      true
    );
  }
}

export let publicTool = <ConfigType extends {}, AuthType extends {}>(
  spec: SlateSpecification<ConfigType, AuthType>,
  params: SlateActionParameters
) => SlatePublicTool.create(spec, params);
