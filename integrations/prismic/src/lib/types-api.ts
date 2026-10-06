import { z } from 'zod';
import { customTypeSchema, exactId, inconsistent, parse, sliceSchema } from './contracts';
import { type ApiConfiguration, PrismicTransport } from './transport';

export interface TypesApiConfig extends ApiConfiguration {
  writeToken: string;
}
export type CustomType = z.infer<typeof customTypeSchema>;
export type SharedSlice = z.infer<typeof sliceSchema>;
export class TypesApiClient {
  private readonly transport: PrismicTransport;
  constructor(config: TypesApiConfig) {
    this.transport = new PrismicTransport(
      config,
      'https://customtypes.prismic.io',
      config.writeToken
    );
  }
  private async read<T>(path: string, schema: z.ZodType<T>) {
    const response = await this.transport.request('GET', path);
    this.transport.check(response.data);
    return parse(schema, response.data);
  }
  async listCustomTypes(): Promise<CustomType[]> {
    return this.read('/customtypes', z.array(customTypeSchema));
  }
  async getCustomType(typeId: string): Promise<CustomType> {
    const value = await this.read(
      `/customtypes/${encodeURIComponent(exactId(typeId))}`,
      customTypeSchema
    );
    return value.id === typeId ? value : inconsistent();
  }
  async createCustomType(customType: CustomType): Promise<CustomType> {
    return this.write('customtypes', 'insert', customType, () =>
      this.getCustomType(customType.id)
    );
  }
  async updateCustomType(customType: CustomType): Promise<CustomType> {
    return this.write('customtypes', 'update', customType, () =>
      this.getCustomType(customType.id)
    );
  }
  async deleteCustomType(typeId: string): Promise<void> {
    const response = await this.transport.request(
      'DELETE',
      `/customtypes/${encodeURIComponent(exactId(typeId))}`
    );
    this.transport.check(response.data);
  }
  async listSharedSlices(): Promise<SharedSlice[]> {
    return this.read('/slices', z.array(sliceSchema));
  }
  async getSharedSlice(sliceId: string): Promise<SharedSlice> {
    const value = await this.read(
      `/slices/${encodeURIComponent(exactId(sliceId))}`,
      sliceSchema
    );
    return value.id === sliceId ? value : inconsistent();
  }
  async createSharedSlice(slice: SharedSlice): Promise<SharedSlice> {
    return this.write('slices', 'insert', slice, () => this.getSharedSlice(slice.id));
  }
  async updateSharedSlice(slice: SharedSlice): Promise<SharedSlice> {
    return this.write('slices', 'update', slice, () => this.getSharedSlice(slice.id));
  }
  async deleteSharedSlice(sliceId: string): Promise<void> {
    const response = await this.transport.request(
      'DELETE',
      `/slices/${encodeURIComponent(exactId(sliceId))}`
    );
    this.transport.check(response.data);
  }
  private async write<T extends { id: string }>(
    resource: string,
    operation: 'insert' | 'update',
    model: T,
    readback: () => Promise<T>
  ) {
    exactId(model.id);
    this.transport.check(model);
    const response = await this.transport.request('POST', `/${resource}/${operation}`, {
      data: model,
      headers: { 'Content-Type': 'application/json' }
    });
    this.transport.check(response.data);
    const confirmed = await readback();
    // Writes replace models; every supplied field must be independently visible.
    const equal = (expected: unknown, actual: unknown): boolean => {
      if (Array.isArray(expected))
        return (
          Array.isArray(actual) &&
          expected.length === actual.length &&
          expected.every((item, i) => equal(item, actual[i]))
        );
      if (expected && typeof expected === 'object')
        return (
          !!actual &&
          typeof actual === 'object' &&
          Object.entries(expected)
            .filter(([, item]) => item !== undefined)
            .every(([key, item]) => equal(item, (actual as Record<string, unknown>)[key]))
        );
      return expected === actual;
    };
    return equal(model, confirmed) ? confirmed : inconsistent();
  }
}
