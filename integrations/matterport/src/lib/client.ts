import { createApiServiceError, createAxios, isApiErrorRecord, pickDefined } from 'slates';
import { z } from 'zod';
import { matterportError } from './errors';

let vectorSchema = z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough();
let dimensionSchema = z
  .object({
    areaCeiling: z.number().nullish(),
    areaFloor: z.number().nullish(),
    areaFloorIndoor: z.number().nullish(),
    areaWall: z.number().nullish(),
    volume: z.number().nullish(),
    depth: z.number().nullish(),
    height: z.number().nullish(),
    width: z.number().nullish(),
    units: z.string().nullish()
  })
  .passthrough();
let modelSummarySchema = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    state: z.string().nullable(),
    created: z.string().nullable(),
    modified: z.string().nullable(),
    description: z.string().nullable()
  })
  .passthrough();
let userSchema = z
  .object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable()
  })
  .passthrough();
let fileSchema = z
  .object({
    url: z.string().nullish(),
    format: z.string().nullish(),
    validUntil: z.string().nullish()
  })
  .passthrough();

let validate = <T extends z.ZodType>(schema: T, value: unknown): z.infer<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Matterport returned malformed response data. Required fields are missing or have invalid types.'
    );
  return parsed.data;
};

let API_BASE_URL = 'https://api.matterport.com/api/models/graph';

export class Client {
  private token: string;
  private authType: 'basic' | 'bearer';

  constructor(config: { token: string; authType: 'basic' | 'bearer' }) {
    this.token = config.token;
    this.authType = config.authType;
    if (!this.token || !['basic', 'bearer'].includes(this.authType))
      throw createApiServiceError(
        'Connect a valid Matterport account before using this tool.'
      );
  }

  private getAuthHeader(): string {
    if (this.authType === 'basic') {
      return `Basic ${this.token}`;
    }
    return `Bearer ${this.token}`;
  }

  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      let response = await createAxios().post(
        API_BASE_URL,
        { query, variables },
        {
          headers: { 'Content-Type': 'application/json', Authorization: this.getAuthHeader() }
        }
      );
      let body: unknown = response.data;
      if (!isApiErrorRecord(body))
        throw createApiServiceError('Matterport returned an invalid GraphQL response.');
      if (body.errors !== undefined && !Array.isArray(body.errors)) {
        throw createApiServiceError('Matterport returned an invalid GraphQL error response.');
      }
      if ((Array.isArray(body.errors) && body.errors.length) || body.error) {
        throw matterportError(
          { response: { status: response.status, data: body } },
          this.getSecrets()
        );
      }
      if (!isApiErrorRecord(body.data))
        throw createApiServiceError('Matterport returned no GraphQL data.');
      for (let value of Object.values(body.data)) {
        if (value === null || value === undefined)
          throw createApiServiceError(
            'Matterport returned no result. Check the model ID and account access.'
          );
      }
      return body.data as T;
    } catch (error) {
      throw matterportError(error, this.getSecrets());
    }
  }

  private getSecrets() {
    let secrets = [this.token];
    if (this.authType === 'basic')
      secrets.push(...Buffer.from(this.token, 'base64').toString().split(':'));
    return secrets;
  }

  private record(value: unknown, label: string): Record<string, any> {
    if (!isApiErrorRecord(value))
      throw createApiServiceError(`Matterport returned invalid ${label} data.`);
    return value;
  }

  private identified(value: unknown, label: string) {
    let record = this.record(value, label);
    if (typeof record.id !== 'string' || !record.id)
      throw createApiServiceError(`Matterport returned ${label} data without a valid ID.`);
    return record;
  }

  private list(value: unknown, label: string, requireId = true): any[] {
    if (!Array.isArray(value))
      throw createApiServiceError(`Matterport returned an invalid ${label} list.`);
    return value.map(item =>
      requireId ? this.identified(item, label) : this.record(item, label)
    );
  }

  // --- Model Queries ---

  async searchModels(
    queryString: string,
    options?: { offset?: string; include?: string; pageSize?: number }
  ) {
    let data = await this.graphql<{ models: any }>(
      `
      query searchModels($query: String!, $offset: String, $include: [SearchInclusion!], $pageSize: Int) {
        models(query: $query, offset: $offset, include: $include, pageSize: $pageSize) {
          totalResults nextOffset
          results { id name description state created modified }
        }
      }
    `,
      pickDefined({
        query: queryString,
        offset: options?.offset,
        include: options?.include ? [options.include] : undefined,
        pageSize: options?.pageSize
      })
    );
    let result = this.record(data.models, 'model search');
    if (typeof result.totalResults !== 'number' || !Number.isFinite(result.totalResults))
      throw createApiServiceError('Matterport returned an invalid model count.');
    this.list(result.results, 'model search results');
    validate(
      z
        .object({
          totalResults: z.number(),
          nextOffset: z.string().nullish(),
          results: z.array(modelSummarySchema)
        })
        .passthrough(),
      result
    );
    return result;
  }

  async getModel(modelId: string) {
    let query = `
      query getModelDetails($modelId: ID!) {
        model(id: $modelId) {
          id
          name
          state
          visibility
          created
          modified
          description
          address {
            address
            streetAddressLines
            locality
            administrativeArea
            postalCode
            countryCode
            countryName
            dependentLocality
            lines
            sortingCode
            status
          }
          publication {
            description
            summary
            address
            contact {
              name
              email
              phoneNumber
            }
            externalUrl
            presentedBy
            published
            url
          }
          mls {
            id
            name
          }
          options {
            socialSharingOverride
            vrOverride
            tourButtonsOverride
            tourAutoplayOverride
            dollhouseOverride
            dollhouseLabelsOverride
            floorplanOverride
            labelsOverride
            highlightReelOverride
          }
        }
      }
    `;

    let data = await this.graphql<{ model: any }>(query, { modelId });
    let model = this.identified(data.model, 'model');
    validate(modelSummarySchema.extend({ visibility: z.string().nullable() }), model);
    return model;
  }

  // --- Model Mutations ---

  async updateModelDetails(modelId: string, patch: Record<string, any>) {
    let query = `
      mutation patchModel($id: ID!, $patch: ModelPatch!) {
        patchModel(id: $id, patch: $patch) {
          id
          name
          description
          mls {
            id
            name
          }
          publication {
            contact {
              name
              email
              phoneNumber
            }
            presentedBy
            externalUrl
            summary
          }
        }
      }
    `;

    let data = await this.graphql<{ patchModel: any }>(query, { id: modelId, patch });
    return this.identified(data.patchModel, 'updated model');
  }

  async updateModelVisibility(modelId: string, visibility: string) {
    let query = `
      mutation toggleModelVisibility($modelId: ID!, $visibility: ModelAccessVisibility!) {
        updateModelAccessVisibility(id: $modelId, visibility: $visibility) {
          id
          accessVisibility
          accessVisibilityLastChanged
          publication {
            published
            url
            externalUrl
            embed
          }
        }
      }
    `;

    let data = await this.graphql<{ updateModelAccessVisibility: any }>(query, {
      modelId,
      visibility
    });
    let result = this.identified(data.updateModelAccessVisibility, 'updated model');
    if (typeof result.accessVisibility !== 'string')
      throw createApiServiceError('Matterport did not confirm the model visibility.');
    return result;
  }

  async updateModelState(modelId: string, state: string) {
    let query = `
      mutation toggleModelActivation($modelId: ID!, $state: ModelStateChange!) {
        updateModelState(id: $modelId, state: $state) {
          id
          state
        }
      }
    `;

    let data = await this.graphql<{ updateModelState: any }>(query, { modelId, state });
    let result = this.identified(data.updateModelState, 'updated model');
    if (typeof result.state !== 'string')
      throw createApiServiceError('Matterport did not confirm the model state.');
    return result;
  }

  // --- Tags ---

  async getTags(modelId: string) {
    let query = `
      query getTags($modelId: ID!) {
        model(id: $modelId) {
          mattertags(includeDisabled: true) {
            id
            floor { id }
            created
            modified
            enabled
            color
            label
            description
            icon
            keywords
            media
            mediaType
            position { x y z }
            anchorPosition { x y z }
            discPosition { x y z }
            stemNormal { x y z }
            stemLength
            stemEnabled
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { mattertags: any[] } }>(query, { modelId });
    let tags = this.list(this.record(data.model, 'model').mattertags, 'tags');
    validate(
      z.array(
        z
          .object({
            id: z.string(),
            floor: z.object({ id: z.string() }).nullish(),
            created: z.string().nullish(),
            modified: z.string().nullish(),
            enabled: z.boolean().nullish(),
            color: z.string().nullish(),
            label: z.string().nullish(),
            description: z.string().nullish(),
            icon: z.string().nullish(),
            keywords: z.array(z.string()).nullish(),
            media: z.string().nullish(),
            mediaType: z.string().nullish(),
            stemLength: z.number().nullish(),
            stemEnabled: z.boolean().nullish()
          })
          .passthrough()
      ),
      tags
    );
    return tags;
  }

  async addTag(
    modelId: string,
    tag: {
      floorId: string;
      label?: string;
      description?: string;
      color?: string;
      icon?: string;
      keywords?: string[];
      enabled?: boolean;
      anchorPosition: { x: number; y: number; z: number };
      stemNormal?: { x: number; y: number; z: number };
      stemLength?: number;
      stemEnabled?: boolean;
      mediaType?: string;
      mediaUrl?: string;
    }
  ) {
    let query = `
      mutation addTag($modelId: ID!, $mattertag: MattertagDetails!) {
        addMattertag(modelId: $modelId, field: id, mattertag: $mattertag) {
          id
        }
      }
    `;

    let mattertag: Record<string, any> = {
      floorId: tag.floorId,
      anchorPosition: tag.anchorPosition,
      enabled: tag.enabled ?? true
    };

    if (tag.label !== undefined) mattertag.label = tag.label;
    if (tag.description !== undefined) mattertag.description = tag.description;
    if (tag.color !== undefined) mattertag.color = tag.color;
    if (tag.icon !== undefined) mattertag.icon = tag.icon;
    if (tag.keywords !== undefined) mattertag.keywords = tag.keywords;
    if (tag.stemNormal !== undefined) mattertag.stemNormal = tag.stemNormal;
    if (tag.stemLength !== undefined) mattertag.stemLength = tag.stemLength;
    if (tag.stemEnabled !== undefined) mattertag.stemEnabled = tag.stemEnabled;
    if (tag.mediaType !== undefined) mattertag.mediaType = tag.mediaType;
    if (tag.mediaUrl !== undefined) mattertag.mediaUrl = tag.mediaUrl;

    let data = await this.graphql<{ addMattertag: any }>(query, { modelId, mattertag });
    return this.identified(data.addMattertag, 'created tag');
  }

  async updateTag(modelId: string, tagId: string, patch: Record<string, any>) {
    let query = `
      mutation patchTag($modelId: ID!, $tagId: ID!, $patch: MattertagPatch!) {
        patchMattertag(modelId: $modelId, field: id, mattertagId: $tagId, patch: $patch) {
          id
        }
      }
    `;

    let data = await this.graphql<{ patchMattertag: any }>(query, { modelId, tagId, patch });
    return this.identified(data.patchMattertag, 'updated tag');
  }

  async deleteTag(modelId: string, tagId: string) {
    let query = `
      mutation deleteTag($modelId: ID!, $tagId: ID!) {
        deleteMattertag(modelId: $modelId, field: id, mattertagId: $tagId)
      }
    `;

    let data = await this.graphql<{ deleteMattertag: any }>(query, { modelId, tagId });
    if (data.deleteMattertag !== true)
      throw createApiServiceError('Matterport did not confirm the tag deletion.');
    return true;
  }

  // --- Panoramic Imagery ---

  async getSweeps(modelId: string, resolution?: string) {
    let res =
      resolution === '512' ? 'low' : resolution === '1k' ? 'high' : (resolution ?? '2k');
    let query = `
      query getSweeps($modelId: ID!, $resolution: String!) {
        model(id: $modelId) {
          locations {
            id
            position { x y z }
            floor { id }
            room { id }
            panos {
              id
              skybox(resolution: $resolution) {
                id
                status
                format
                children
                validUntil
              }
            }
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { locations: any[] } }>(query, {
      modelId,
      resolution: res
    });
    let locations = this.list(this.record(data.model, 'model').locations, 'sweep locations');
    for (let location of locations) this.list(location.panos, 'panoramas');
    validate(
      z.array(
        z.object({
          id: z.string(),
          position: vectorSchema.nullish(),
          floor: z.object({ id: z.string() }).nullish(),
          room: z.object({ id: z.string() }).nullish(),
          panos: z.array(
            z.object({
              id: z.string(),
              skybox: z
                .object({
                  id: z.string().nullish(),
                  status: z.string().nullish(),
                  format: z.string().nullish(),
                  children: z.array(z.string()).nullish(),
                  validUntil: z.string().nullish()
                })
                .nullish()
            })
          )
        })
      ),
      locations
    );
    return locations;
  }

  // --- Assets ---

  async getFloorplans(modelId: string) {
    let query = `
      query getFloorplans($modelId: ID!) {
        model(id: $modelId) {
          assets {
            floorplans {
              id
              validUntil
              floor { label sequence }
              format
              flags
              url
              origin { x y }
              width
              height
              resolution
            }
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { assets: { floorplans: any[] } } }>(query, {
      modelId
    });
    let floorplans = this.list(
      this.record(this.record(data.model, 'model').assets, 'assets').floorplans,
      'floorplans',
      false
    );
    validate(
      z.array(
        fileSchema.extend({
          floor: z
            .object({ label: z.string().nullish(), sequence: z.number().nullish() })
            .nullish(),
          flags: z.array(z.string()).nullish(),
          width: z.number().nullish(),
          height: z.number().nullish(),
          resolution: z.number().nullish()
        })
      ),
      floorplans
    );
    return floorplans;
  }

  async getAssetBundles(modelId: string) {
    let query = `
      query getAssetBundles($modelId: ID!) {
        model(id: $modelId) {
          bundles {
            id name description availability
            assets { id url format validUntil }
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { bundles: any[] } }>(query, { modelId });
    let bundles = this.list(this.record(data.model, 'model').bundles, 'bundles');
    for (let bundle of bundles)
      if (bundle.assets != null) this.list(bundle.assets, 'bundle assets', false);
    validate(
      z.array(
        z.object({
          id: z.string(),
          name: z.string().nullish(),
          description: z.string().nullish(),
          availability: z.string().nullish(),
          assets: z.array(fileSchema).nullish()
        })
      ),
      bundles
    );
    return bundles;
  }

  async purchaseBundle(modelId: string, bundleId: string, deliverySpeed?: string) {
    let data = await this.graphql<{ unlockModelBundle: any }>(
      `
      mutation purchaseBundle($modelId: ID!, $bundleId: ID!, $deliverySpeed: DeliverySpeed) {
        unlockModelBundle(id: $modelId, bundleId: $bundleId, options: { deliverySpeed: $deliverySpeed }) {
          id name description availability
          assets { id url format validUntil }
        }
      }
    `,
      pickDefined({ modelId, bundleId, deliverySpeed })
    );
    let bundle = this.identified(data.unlockModelBundle, 'purchased bundle');
    validate(
      z.object({
        id: z.string(),
        name: z.string().nullish(),
        description: z.string().nullish(),
        availability: z.string().nullish(),
        assets: z.array(fileSchema).nullish()
      }),
      bundle
    );
    return bundle;
  }

  // --- Dimensions ---

  async getDimensions(modelId: string, units?: string) {
    let query = `
      query getDimensions($modelId: ID!, $units: Units) {
        model(id: $modelId) {
          id
          name
          description
          dimensions {
            areaCeiling
            areaFloor
            areaFloorIndoor
            areaWall
            volume
            depth
            height
            width
            units
          }
          floors {
            id
            label
            dimensions(units: $units) {
              areaCeiling
              areaFloor
              areaFloorIndoor
              areaWall
              volume
              depth
              height
              width
              units
            }
          }
          rooms {
            id
            label
            tags
            dimensions {
              areaCeiling
              areaFloor
              areaFloorIndoor
              areaWall
              volume
              depth
              height
              width
              units
            }
          }
        }
      }
    `;

    let data = await this.graphql<{ model: any }>(query, pickDefined({ modelId, units }));
    let model = this.identified(data.model, 'model');
    this.list(model.floors, 'floors');
    this.list(model.rooms, 'rooms');
    validate(
      z.object({
        name: z.string().nullable(),
        description: z.string().nullable(),
        dimensions: dimensionSchema.nullable(),
        floors: z.array(
          z.object({
            id: z.string(),
            label: z.string().nullish(),
            dimensions: dimensionSchema.nullable()
          })
        ),
        rooms: z.array(
          z.object({
            id: z.string(),
            label: z.string().nullish(),
            tags: z.array(z.string()).nullish(),
            dimensions: dimensionSchema.nullable()
          })
        )
      }),
      model
    );
    return model;
  }

  // --- Notes ---

  async getNotes(modelId: string) {
    let query = `
      query getNotes($modelId: ID!) {
        model(id: $modelId) {
          notes(includeDisabled: true) {
            id
            created
            modified
            label
            enabled
            createdBy {
              id
              firstName
              lastName
              email
            }
            resolution
            color
            anchorPosition { x y z }
            discPosition { x y z }
            stemNormal { x y z }
            stemLength
            stemEnabled
            totalComments
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { notes: any[] } }>(query, { modelId });
    let notes = this.list(this.record(data.model, 'model').notes, 'notes');
    validate(
      z.array(
        z.object({
          id: z.string(),
          created: z.string().nullish(),
          modified: z.string().nullish(),
          label: z.string().nullish(),
          enabled: z.boolean().nullish(),
          createdBy: userSchema.nullish(),
          resolution: z.string().nullish(),
          color: z.string().nullish(),
          totalComments: z.number().nullish()
        })
      ),
      notes
    );
    return notes;
  }

  async getFloors(modelId: string) {
    let data = await this.graphql<{ model: any }>(
      `
      query getFloors($modelId: ID!) {
        model(id: $modelId) { floors { id label sequence } }
      }
    `,
      { modelId }
    );
    return this.list(this.record(data.model, 'model').floors, 'floors');
  }

  async getNoteComments(
    modelId: string,
    noteId: string,
    options: { offset?: string; pageSize?: number }
  ) {
    let data = await this.graphql<{ model: any }>(
      `
      query getNoteComments($modelId: ID!, $noteId: ID!, $offset: String, $pageSize: Int) {
        model(id: $modelId) {
          notes(ids: [$noteId], includeDisabled: true) {
            id
            comments(offset: $offset, pageSize: $pageSize, sortBy: { field: created }) {
              nextOffset
              results { id created modified edited text createdBy { id firstName lastName email } }
            }
          }
        }
      }
    `,
      pickDefined({ modelId, noteId, ...options })
    );
    let notes = this.list(this.record(data.model, 'model').notes, 'notes');
    let note = notes.find(item => item.id === noteId);
    if (!note)
      throw createApiServiceError(
        'The Matterport note was not found. Check the note ID and account access.'
      );
    let comments = this.record(note.comments, 'comments');
    this.list(comments.results, 'comments');
    validate(
      z.object({
        nextOffset: z.string().nullish(),
        results: z.array(
          z.object({
            id: z.string(),
            text: z.string().nullable(),
            created: z.string(),
            modified: z.string(),
            edited: z.boolean(),
            createdBy: userSchema
          })
        )
      }),
      comments
    );
    return comments;
  }
}
