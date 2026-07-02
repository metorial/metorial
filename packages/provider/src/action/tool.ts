import type z from 'zod';
import type { SlateSpecification } from '../specification/specification';
import {
  SlateAction,
  type SlateActionParameters,
  type SlateToolInvocationHandler
} from './action';
import { SlateActionBuilder } from './builder';

export interface SlateToolParameters<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> extends SlateActionParameters {
  handleInvocation: SlateToolInvocationHandler<ConfigType, AuthType, InputType, OutputType>;
}

export class SlateTool<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {}
> extends SlateAction<'tool', ConfigType, AuthType, InputType, OutputType> {
  #handleInvocation: SlateToolInvocationHandler<ConfigType, AuthType, InputType, OutputType>;

  private constructor(
    spec: SlateSpecification<ConfigType, AuthType>,
    inputSchema: z.ZodType<InputType>,
    outputSchema: z.ZodType<OutputType>,
    params: SlateToolParameters<ConfigType, AuthType, InputType, OutputType>
  ) {
    super('tool', spec, inputSchema, outputSchema, params);

    this.#handleInvocation = params.handleInvocation;
  }

  static create<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateActionParameters
  ) {
    return new SlateActionBuilder('tool', spec, params, params => {
      if (params.type !== 'tool') throw new Error('Invalid action type for tool');
      return new SlateTool(spec, params.inputSchema, params.outputSchema, params);
    });
  }

  get handleInvocation() {
    return this.#handleInvocation;
  }
}

export let tool = <ConfigType extends {}, AuthType extends {}>(
  spec: SlateSpecification<ConfigType, AuthType>,
  params: SlateActionParameters
) => SlateTool.create(spec, params);
