import type z from 'zod';
import type { SlateConfigDocsReference } from '../docs';

export class SlateConfig<ConfigType extends {}> {
  #configSchema: z.ZodType<ConfigType>;
  #docs: SlateConfigDocsReference[] | undefined;
  #configChanged:
    | ((params: {
        previousConfig: ConfigType | null;
        newConfig: ConfigType;
      }) => { config: ConfigType | undefined } | undefined)
    | null = null;
  #getDefaultConfig: (() => ConfigType) | null = null;

  private constructor(schema: z.ZodType<ConfigType>) {
    this.#configSchema = schema;
  }

  static create<ConfigType extends {}>(schema: z.ZodType<ConfigType>) {
    return new SlateConfig<ConfigType>(schema);
  }

  config<NewConfigType extends {}>(
    schema: z.ZodType<NewConfigType>
  ): SlateConfig<NewConfigType> {
    this.#configSchema = schema as any;
    return this as any as SlateConfig<NewConfigType>;
  }

  docs(docs: SlateConfigDocsReference[]): SlateConfig<ConfigType> {
    this.#docs = docs;
    return this;
  }

  onConfigChanged(
    handler: (params: {
      previousConfig: ConfigType | null;
      newConfig: ConfigType;
    }) => { config: ConfigType | undefined } | undefined
  ): SlateConfig<ConfigType> {
    this.#configChanged = handler;
    return this;
  }

  getDefaultConfig(getter: () => ConfigType): SlateConfig<ConfigType> {
    this.#getDefaultConfig = getter;
    return this;
  }

  get configSchema() {
    return this.#configSchema;
  }

  get docsReferences() {
    return this.#docs;
  }

  get handlers() {
    return {
      configChanged: this.#configChanged,
      getDefaultConfig: this.#getDefaultConfig
    };
  }
}

export let config = <ConfigType extends {}>(schema: z.ZodType<ConfigType>) =>
  SlateConfig.create<ConfigType>(schema);
