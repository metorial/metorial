import type { SlateTool } from './tool';

export interface SlateToolCategoryParameters {
  key: string;
  name: string;
  description?: string;
  imageUrl?: string;
  tools: SlateTool<any, any, any, any>[];
}

export class SlateToolCategory {
  private constructor(private readonly _params: SlateToolCategoryParameters) {}

  static create(params: SlateToolCategoryParameters) {
    return new SlateToolCategory(params);
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

  get imageUrl() {
    return this._params.imageUrl;
  }

  get tools() {
    return this._params.tools;
  }
}

export let toolCategory = (params: SlateToolCategoryParameters) =>
  SlateToolCategory.create(params);
