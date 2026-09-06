import type z from 'zod';
import type { SlateSpecification } from '../specification/specification';
import {
  SlateAction,
  type SlateActionParameters,
  type SlateTriggerMappingHandler,
  type SlateTriggerMatchesHandler
} from './action';
import { SlateActionBuilder } from './builder';
import type { SlateTriggerGroup } from './triggerGroup';

export interface SlateTriggerParameters<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {
    type: string;
  }
> extends SlateActionParameters {
  type: 'trigger';
  triggerGroup: SlateTriggerGroup<ConfigType, AuthType>;
  matches: SlateTriggerMatchesHandler;
  map: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;
}

export class SlateTrigger<
  ConfigType extends {},
  AuthType extends {},
  InputType extends {},
  OutputType extends {
    type: string;
  }
> extends SlateAction<'trigger', ConfigType, AuthType, InputType, OutputType> {
  #triggerGroup: SlateTriggerGroup<ConfigType, AuthType>;
  #matches: SlateTriggerMatchesHandler;
  #map: SlateTriggerMappingHandler<ConfigType, AuthType, InputType, OutputType>;

  private constructor(
    spec: SlateSpecification<ConfigType, AuthType>,
    inputSchema: z.ZodType<InputType>,
    outputSchema: z.ZodType<OutputType>,
    params: SlateTriggerParameters<ConfigType, AuthType, InputType, OutputType>
  ) {
    super('trigger', spec, inputSchema, outputSchema, params);

    this.#triggerGroup = params.triggerGroup;
    this.#matches = params.matches;
    this.#map = params.map;
  }

  static create<ConfigType extends {}, AuthType extends {}>(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateActionParameters
  ) {
    return new SlateActionBuilder('trigger', spec, params, params => {
      if (params.type !== 'trigger') throw new Error('Invalid action type for trigger');
      return new SlateTrigger(spec, params.inputSchema, params.outputSchema, params);
    });
  }

  get triggerGroup() {
    return this.#triggerGroup;
  }

  get matches() {
    return this.#matches;
  }

  get map() {
    return this.#map;
  }
}

export let trigger = <ConfigType extends {}, AuthType extends {}>(
  spec: SlateSpecification<ConfigType, AuthType>,
  params: SlateActionParameters
) => SlateTrigger.create(spec, params);
