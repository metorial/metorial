import type {
  SlateActionBuilder,
  SlateActionParameters,
  SlateSpecification,
  SlateTool
} from '@slates/provider';
import type z from 'zod';
import type { SlateAdapterDefinition } from './definition';

export class SlateAdapterToolDefinition<
  InputType extends {},
  OutputType extends {},
  IsPublic extends boolean = false,
  Key extends string = string
> {
  constructor(
    private readonly adapter: SlateAdapterDefinition<any>,
    private readonly params: Omit<SlateActionParameters, 'adapter' | 'key'> & {
      key: Key;
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    },
    private readonly isPublicTool: IsPublic = false as IsPublic
  ) {}

  get key(): Key {
    return this.params.key;
  }

  get name() {
    return this.params.name;
  }

  get input() {
    return this.params.input;
  }

  get output() {
    return this.params.output;
  }

  get isPublic() {
    return this.isPublicTool === true;
  }

  implement<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>
  ): IsPublic extends true
    ? SlateActionBuilder<
        'tool',
        ConfigType,
        AuthType,
        InputType,
        OutputType,
        SlateTool<ConfigType, AuthType, InputType, OutputType>,
        true
      >
    : SlateActionBuilder<
        'tool',
        ConfigType,
        AuthType,
        InputType,
        OutputType,
        SlateTool<ConfigType, AuthType, InputType, OutputType>,
        false
      > {
    let { input, output, ...actionParams } = this.params;

    if (this.isPublicTool) {
      return this.adapter
        .createPublicToolBuilder(spec, actionParams)
        .input(input)
        .output(output)
        .lockInterface() as any;
    }

    return this.adapter
      .createToolBuilder(spec, actionParams)
      .input(input)
      .output(output)
      .lockInterface() as any;
  }
}
