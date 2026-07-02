import type z from 'zod';
import type { SlateAuthType } from './types';

export class SlateAuth<OutputType extends {} = {}> {
  #outputSchema: z.ZodType<OutputType> | null = null;
  #authStack: SlateAuthType<any, OutputType>[] = [];

  private constructor() {}

  static create<OutputType extends {}>() {
    return new SlateAuth<OutputType>();
  }

  output<NewOutputType extends {}>(
    schema: z.ZodType<NewOutputType>
  ): SlateAuth<NewOutputType> {
    this.#outputSchema = schema as any;
    return this as any as SlateAuth<NewOutputType>;
  }

  private addAuth<InputType extends {}>(
    auth: SlateAuthType<InputType, OutputType>
  ): SlateAuth<OutputType> {
    let existingKeys = this.#authStack.map(a => a.key);
    if (existingKeys.includes(auth.key)) {
      throw new Error(`Auth with key "${auth.key}" already exists in the auth stack`);
    }

    this.#authStack.push(auth);
    return this;
  }

  addOauth<InputType extends {}>(
    auth: SlateAuthType<InputType, OutputType> & { type: 'auth.oauth' }
  ): SlateAuth<OutputType> {
    this.addAuth(auth as any);
    return this;
  }

  addTokenAuth<InputType extends {}>(
    auth: SlateAuthType<InputType, OutputType> & { type: 'auth.token' }
  ): SlateAuth<OutputType> {
    this.addAuth(auth as any);
    return this;
  }

  addServiceAccountAuth<InputType extends {}>(
    auth: SlateAuthType<InputType, OutputType> & { type: 'auth.service_account' }
  ): SlateAuth<OutputType> {
    this.addAuth(auth as any);
    return this;
  }

  addCustomAuth<InputType extends {}>(
    auth: SlateAuthType<InputType, OutputType> & { type: 'auth.custom' }
  ): SlateAuth<OutputType> {
    this.addAuth(auth as any);
    return this;
  }

  addNone(): SlateAuth<OutputType> {
    this.addAuth({
      type: 'auth.none',
      name: 'No Authentication',
      key: 'none'
    });
    return this;
  }

  get authStack() {
    return this.#authStack.filter(a => a.type !== 'auth.none');
  }

  get outputSchema() {
    if (!this.#outputSchema) {
      throw new Error('Output schema is not defined for this auth');
    }
    return this.#outputSchema;
  }
}

export let auth = <OutputType extends {} = {}>() => SlateAuth.create<OutputType>();
