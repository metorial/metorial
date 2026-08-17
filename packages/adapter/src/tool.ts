import type { SlateActionParameters, SlateSpecification } from '@slates/provider';
import type z from 'zod';
import type { SlateAdapterDefinition } from './definition';

export class SlateAdapterToolDefinition<InputType extends {}, OutputType extends {}> {
  constructor(
    private readonly adapter: SlateAdapterDefinition<any>,
    private readonly params: Omit<SlateActionParameters, 'adapter'> & {
      input: z.ZodType<InputType>;
      output: z.ZodType<OutputType>;
    }
  ) {}

  get key() {
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

  implement<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>
  ) {
    let { input, output, ...actionParams } = this.params;

    return this.adapter
      .createToolBuilder(spec, actionParams)
      .input(input)
      .output(output)
      .lockInterface();
  }
}
