import type { SlateActionParameters, SlateSpecification, SlateTriggerGroup } from '@slates/provider';
import type z from 'zod';
import type { SlateAdapterDefinition } from './definition';

export class SlateAdapterTriggerDefinition<
  OutputType extends {},
  Key extends string = string
> {
  constructor(
    private readonly adapter: SlateAdapterDefinition<any>,
    private readonly params: Omit<SlateActionParameters, 'adapter' | 'key'> & {
      key: Key;
      output: z.ZodType<OutputType>;
    }
  ) {}

  get key(): Key {
    return this.params.key;
  }

  get name() {
    return this.params.name;
  }

  get output() {
    return this.params.output;
  }

  implement<ConfigType extends {}, AuthType extends {}, InputType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    triggerGroup: SlateTriggerGroup<ConfigType, AuthType, InputType>
  ) {
    let { output, ...actionParams } = this.params;

    return this.adapter
      .createTriggerBuilder(spec, actionParams)
      .input(triggerGroup.eventSchema)
      .output(output)
      .triggerGroup(triggerGroup)
      .lockInterface();
  }
}
