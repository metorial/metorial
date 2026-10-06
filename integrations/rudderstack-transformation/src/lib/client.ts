import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord,
  pickDefined
} from 'slates';
import { z } from 'zod';
import {
  libraryMetadataSchema,
  librarySchema,
  libraryVersionSchema,
  type testRequestSchema,
  testResponseSchema,
  transformationMetadataSchema,
  transformationSchema,
  transformationVersionSchema
} from './models';

export const apiBases = {
  us: 'https://api.rudderstack.com',
  eu: 'https://api.eu.rudderstack.com'
} as const;
const pathId = (value: string) => {
  if (!value.trim() || value !== value.trim() || value === '.' || value === '..')
    throw createApiServiceError(
      'Provide a nonempty resource ID without surrounding whitespace.'
    );
  try {
    return encodeURIComponent(value);
  } catch {
    throw createApiServiceError('The resource ID contains invalid characters.');
  }
};
const query = (params?: { count?: number; orderBy?: 'asc' | 'desc' }) => {
  if (params?.count !== undefined && (!Number.isSafeInteger(params.count) || params.count < 1))
    throw createApiServiceError('count must be a positive safe integer.');
  return pickDefined({ ...params });
};
const requireUpdate = (value: Record<string, unknown>) => {
  if (!Object.values(value).some(item => item !== undefined))
    throw createApiServiceError('Provide at least one field to update.');
};
export class Client {
  private http;
  constructor(params: { token: string; region: string }) {
    if (!params.token.trim())
      throw createApiServiceError(
        'A RudderStack Service Access Token or Personal Access Token is required.'
      );
    if (params.region !== 'us' && params.region !== 'eu')
      throw createApiServiceError('Choose the US or EU RudderStack management API region.');
    this.http = createAuthenticatedAxios({
      baseURL: apiBases[params.region],
      authHeader: { value: `Bearer ${params.token}` },
      headers: { Accept: 'application/json' },
      timeout: 30000,
      maxRedirects: 0,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'RudderStack Transformations',
          reason: 'rudderstack_transformation_api_error',
          parent: {},
          formatMessage: ({ providerLabel, status, message }) =>
            `${providerLabel} API request failed: ${typeof status === 'number' ? `HTTP ${status}: ` : ''}${message}`,
          extractMessage: () =>
            'The API request failed. Check the requested IDs, token permissions and submitted code or test configuration.'
        })
    });
  }
  private parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
    const result = schema.safeParse(value);
    if (!result.success)
      throw createApiServiceError(
        'RudderStack returned an invalid Transformations API response.'
      );
    return result.data;
  }
  private collection<T extends z.ZodType>(
    value: unknown,
    schema: T,
    key: string,
    aliases: string[] = []
  ): z.output<T>[] {
    if (Array.isArray(value)) return this.parse(z.array(schema), value);
    if (isApiErrorRecord(value))
      for (const field of [key, ...aliases])
        if (value[field] !== undefined) return this.parse(z.array(schema), value[field]);
    throw createApiServiceError('RudderStack returned an unexpected collection response.');
  }
  private publishing(params: { publish?: boolean; destinationIds?: string[] }) {
    if (params.destinationIds?.length && !params.publish)
      throw createApiServiceError(
        'Destination connections require publish: true. Omit destinationIds when saving a draft.'
      );
    params.destinationIds?.forEach(pathId);
    return { params: { publish: params.publish ?? false } };
  }
  async createTransformation(params: {
    name: string;
    code: string;
    language: string;
    description?: string;
    publish?: boolean;
    destinationIds?: string[];
    events?: unknown[];
  }) {
    const { publish, ...body } = params;
    return this.parse(
      transformationSchema,
      (await this.http.post('/transformations', pickDefined(body), this.publishing(params)))
        .data
    );
  }
  async getTransformation(id: string) {
    return this.parse(
      transformationSchema,
      (await this.http.get(`/transformations/${pathId(id)}`)).data
    );
  }
  async listTransformations() {
    return this.collection(
      (await this.http.get('/transformations')).data,
      transformationMetadataSchema,
      'transformations'
    );
  }
  async updateTransformation(
    id: string,
    params: {
      name?: string;
      code?: string;
      description?: string;
      publish?: boolean;
      destinationIds?: string[];
    }
  ) {
    requireUpdate(params);
    const { publish, ...body } = params;
    return this.parse(
      transformationSchema,
      (
        await this.http.post(
          `/transformations/${pathId(id)}`,
          pickDefined(body),
          this.publishing(params)
        )
      ).data
    );
  }
  async deleteTransformation(id: string) {
    await this.http.delete(`/transformations/${pathId(id)}`);
  }
  async listTransformationVersions(
    id: string,
    params?: { count?: number; orderBy?: 'asc' | 'desc' }
  ) {
    return this.collection(
      (
        await this.http.get(`/transformations/${pathId(id)}/versions`, {
          params: query(params)
        })
      ).data,
      transformationVersionSchema,
      'TransformationVersions',
      ['transformationVersions', 'versions']
    );
  }
  async getTransformationVersion(id: string, versionId: string) {
    return this.parse(
      transformationVersionSchema,
      (await this.http.get(`/transformations/${pathId(id)}/versions/${pathId(versionId)}`))
        .data
    );
  }
  async createLibrary(params: {
    name: string;
    code: string;
    language: string;
    description?: string;
    publish?: boolean;
  }) {
    const { publish, ...body } = params;
    return this.parse(
      librarySchema,
      (
        await this.http.post('/libraries', pickDefined(body), {
          params: { publish: publish ?? false }
        })
      ).data
    );
  }
  async getLibrary(id: string) {
    return this.parse(librarySchema, (await this.http.get(`/libraries/${pathId(id)}`)).data);
  }
  async listLibraries() {
    return this.collection(
      (await this.http.get('/libraries')).data,
      libraryMetadataSchema,
      'libraries'
    );
  }
  async updateLibrary(
    id: string,
    params: { code?: string; description?: string; publish?: boolean }
  ) {
    requireUpdate(params);
    const latest = (await this.listLibraryVersions(id, { count: 1, orderBy: 'desc' }))[0];
    if (!latest) throw createApiServiceError('The library has no current revision to update.');
    if (latest.id !== id)
      throw createApiServiceError('RudderStack returned a revision for a different library.');
    return this.parse(
      librarySchema,
      (
        await this.http.post(
          `/libraries/${pathId(id)}`,
          pickDefined({
            code: params.code ?? latest.code,
            description: params.description,
            language: latest.language
          }),
          { params: { publish: params.publish ?? false } }
        )
      ).data
    );
  }
  async deleteLibrary(id: string) {
    await this.http.delete(`/libraries/${pathId(id)}`);
  }
  async listLibraryVersions(
    id: string,
    params?: { count?: number; orderBy?: 'asc' | 'desc' }
  ) {
    return this.collection(
      (await this.http.get(`/libraries/${pathId(id)}/versions`, { params: query(params) }))
        .data,
      libraryVersionSchema,
      'libraryVersions',
      ['versions']
    );
  }
  async getLibraryVersion(id: string, versionId: string) {
    return this.parse(
      libraryVersionSchema,
      (await this.http.get(`/libraries/${pathId(id)}/versions/${pathId(versionId)}`)).data
    );
  }
  async publish(params: {
    transformations?: { versionId: string; testInput?: unknown[] }[];
    libraries?: { versionId: string }[];
  }) {
    if (!params.transformations?.length && !params.libraries?.length)
      throw createApiServiceError(
        'Provide at least one transformation or library version to publish.'
      );
    for (const entry of [...(params.transformations ?? []), ...(params.libraries ?? [])])
      pathId(entry.versionId);
    const result = (await this.http.post('/libraries/publish', pickDefined(params))).data;
    if (
      result === false ||
      (isApiErrorRecord(result) &&
        [result.published, result.pass, result.success].includes(false))
    )
      throw createApiServiceError(
        'RudderStack rejected publication validation. The requested versions were not confirmed published.'
      );
  }
  async manageDestinationConnection(
    id: string,
    destinationId: string,
    action: 'connect' | 'disconnect'
  ) {
    pathId(destinationId);
    return this.parse(
      transformationSchema,
      (
        await this.http.post(
          `/transformations/${pathId(id)}/${action === 'connect' ? 'connectToDestination' : 'disconnectFromDestination'}`,
          { destinationId }
        )
      ).data
    );
  }
  async testTransformations(params: z.infer<typeof testRequestSchema>) {
    if (!params.transformations?.length && !params.libraries?.length)
      throw createApiServiceError(
        'Provide at least one transformation or library revision to test.'
      );
    for (const entry of [...(params.transformations ?? []), ...(params.libraries ?? [])])
      pathId(entry.versionId);
    for (const entry of params.transformations ?? [])
      if (
        !entry.testSuite.length ||
        new Set(entry.testSuite.map(test => test.id)).size !== entry.testSuite.length ||
        entry.testSuite.some(
          test => !test.id.trim() || !test.name.trim() || !test.input.length
        )
      )
        throw createApiServiceError(
          'Each transformation needs a named, nonempty test suite with unique case IDs and input events.'
        );
    for (const entries of [params.transformations ?? [], params.libraries ?? []])
      if (new Set(entries.map(entry => entry.versionId)).size !== entries.length)
        throw createApiServiceError('Provide each revision ID only once per resource type.');
    const result = this.parse(
      testResponseSchema,
      (await this.http.post('/transformations/tests/run', pickDefined(params))).data
    );
    for (const requested of params.transformations ?? []) {
      const matches =
        result.validationOutput.transformations?.filter(
          value => value.versionId === requested.versionId
        ) ?? [];
      if (matches.length !== 1)
        throw createApiServiceError(
          'RudderStack must report exactly one validation result for each requested transformation revision.'
        );
      const actual = matches[0];
      if (!actual)
        throw createApiServiceError(
          'RudderStack did not report a requested transformation revision.'
        );
      if (actual.pass && !actual.testResult)
        throw createApiServiceError(
          'RudderStack did not report results for a requested transformation test suite.'
        );
      if (actual.testResult)
        for (const test of requested.testSuite)
          if (actual.testResult.results.filter(value => value.id === test.id).length !== 1)
            throw createApiServiceError(
              'RudderStack must report exactly one result for each requested test case.'
            );
    }
    for (const requested of params.libraries ?? [])
      if (
        result.validationOutput.libraries?.filter(
          value => value.versionId === requested.versionId
        ).length !== 1
      )
        throw createApiServiceError(
          'RudderStack must report exactly one validation result for each requested library revision.'
        );
    const transformations = (result.validationOutput.transformations ?? []).map(value => ({
      ...value,
      pass:
        value.pass &&
        (!value.testResult ||
          (value.testResult.status === 'pass' &&
            value.testResult.results.every(
              test => test.status === 'pass' && !test.errors?.length
            )))
    }));
    const pass =
      result.pass &&
      !(
        transformations.some(value => !value.pass) ||
        (result.validationOutput.libraries ?? []).some(value => !value.pass)
      );
    return {
      ...result,
      pass,
      validationOutput: {
        transformations: transformations
          .filter(value =>
            params.transformations?.some(entry => entry.versionId === value.versionId)
          )
          .map(value => {
            const requested = params.transformations?.find(
              entry => entry.versionId === value.versionId
            );
            return {
              ...value,
              testResult: value.testResult && {
                ...value.testResult,
                results: value.testResult.results.filter(test =>
                  requested?.testSuite.some(entry => entry.id === test.id)
                )
              }
            };
          }),
        libraries: (result.validationOutput.libraries ?? []).filter(value =>
          params.libraries?.some(entry => entry.versionId === value.versionId)
        )
      }
    };
  }
}
