import z from 'zod';
import type { SlateAuth } from '../auth';
import type { SlateConfig } from '../config';
import type { SlateProviderDocsReference } from '../docs';

export interface SlateSpecificationParameters {
  key: string;
  name: string;
  description?: string;
  docs?: SlateProviderDocsReference[];
  metadata?: Record<string, any>;
}

export interface SlateSpecificationCreateParameters<ConfigType extends {}, AuthType extends {}>
  extends SlateSpecificationParameters {
  config: SlateConfig<ConfigType>;
  auth: SlateAuth<AuthType>;
}

export class SlateSpecification<ConfigType extends {}, AuthType extends {}> {
  private constructor(
    private readonly _config: SlateConfig<ConfigType>,
    private readonly _auth: SlateAuth<AuthType>,
    private readonly _params: SlateSpecificationParameters
  ) {}

  static create<ConfigType extends {}, AuthType extends {}>(
    params: SlateSpecificationCreateParameters<ConfigType, AuthType>
  ): SlateSpecification<ConfigType, AuthType> {
    return new SlateSpecification(params.config, params.auth, params);
  }

  get configSchema() {
    return this._config.configSchema;
  }

  get authSchema() {
    return (
      'outputSchema' in this._auth ? this._auth.outputSchema : z.object({})
    ) as z.ZodType<AuthType>;
  }

  get config() {
    return this._config;
  }

  get auth() {
    return this._auth;
  }

  get parameters() {
    return this._params;
  }

  get key() {
    return this._params.key;
  }

  get name() {
    return this._params.name;
  }

  get description() {
    return this._params.description;
  }

  get docs() {
    return this._params.docs;
  }
}

export let spec = <ConfigType extends {}, AuthType extends {}>(
  params: SlateSpecificationCreateParameters<ConfigType, AuthType>
): SlateSpecification<ConfigType, AuthType> => SlateSpecification.create(params);
