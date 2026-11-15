import { z } from 'zod';
import type { SlateContext } from '../context';
import { SlateDeclarationError } from '../error';
import type { SlateSpecification } from '../specification/specification';

export interface SlateOption {
  value: string | number;
  label: string;
  description?: string;
}

export interface SlateOptionListPage {
  options: SlateOption[];
  nextPageToken?: any | null;
}

export type SlateOptionListHandler<
  ConfigType extends {},
  AuthType extends {},
  ParamsType extends {} = {}
> = (
  context: SlateContext<
    ConfigType,
    AuthType,
    { query: string | null; pageToken: any | null; params: ParamsType }
  >
) => Promise<SlateOptionListPage>;

export interface SlateOptionListParameters<
  ConfigType extends {},
  AuthType extends {},
  ParamsSchema extends z.ZodObject<any> = z.ZodObject<{}>
> {
  key: string;
  /** Made strict when declared, so params with a key the schema does not name are rejected. */
  paramsSchema?: ParamsSchema;
  list: SlateOptionListHandler<ConfigType, AuthType, z.output<ParamsSchema>>;
}

/** A list of options other integrations can link their selection fields to. */
export class SlateOptionList<
  ConfigType extends {},
  AuthType extends {},
  ParamsSchema extends z.ZodObject<any> = z.ZodObject<{}>
> {
  private constructor(
    private readonly _spec: SlateSpecification<ConfigType, AuthType>,
    private readonly _params: SlateOptionListParameters<ConfigType, AuthType, ParamsSchema>,
    private readonly _paramsSchema: z.ZodObject<any>
  ) {}

  static create<
    ConfigType extends {},
    AuthType extends {},
    ParamsSchema extends z.ZodObject<any> = z.ZodObject<{}>
  >(
    spec: SlateSpecification<ConfigType, AuthType>,
    params: SlateOptionListParameters<ConfigType, AuthType, ParamsSchema>
  ) {
    let paramsSchema: z.ZodObject<any> = params.paramsSchema ?? z.object({});
    if (paramsSchema?._zod?.def?.type !== 'object') {
      throw new SlateDeclarationError(
        `Option list "${params.key}" params schema must be a zod object`
      );
    }

    return new SlateOptionList(spec, params, paramsSchema.strict());
  }

  get spec() {
    return this._spec;
  }

  get key() {
    return this._params.key;
  }

  get paramsSchema() {
    return this._paramsSchema;
  }

  get list() {
    return this._params.list;
  }
}

export let optionList = <
  ConfigType extends {},
  AuthType extends {},
  ParamsSchema extends z.ZodObject<any> = z.ZodObject<{}>
>(
  spec: SlateSpecification<ConfigType, AuthType>,
  params: SlateOptionListParameters<ConfigType, AuthType, ParamsSchema>
) => SlateOptionList.create(spec, params);
