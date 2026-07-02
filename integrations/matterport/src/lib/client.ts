import { createAxios } from 'slates';

let API_BASE_URL = 'https://api.matterport.com/api/models/graph';

export class Client {
  private token: string;
  private authType: 'basic' | 'bearer';

  constructor(config: { token: string; authType: 'basic' | 'bearer' }) {
    this.token = config.token;
    this.authType = config.authType;
  }

  private getAuthHeader(): string {
    if (this.authType === 'basic') {
      return `Basic ${this.token}`;
    }
    return `Bearer ${this.token}`;
  }

  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let axios = createAxios();

    let response = await axios.post(
      API_BASE_URL,
      {
        query,
        variables
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.getAuthHeader()
        }
      }
    );

    if (response.data.errors && response.data.errors.length > 0) {
      let errorMessages = response.data.errors.map((e: any) => e.message).join('; ');
      throw new Error(`GraphQL error: ${errorMessages}`);
    }

    return response.data.data as T;
  }

  // --- Model Queries ---

  async searchModels(queryString: string, options?: { offset?: string; include?: string }) {
    let includeArg = options?.include ? `, include: ${options.include}` : '';
    let offsetArg = options?.offset ? `, offset: "${options.offset}"` : '';

    let query = `
      query searchModels {
        models(query: "${queryString}"${offsetArg}${includeArg}) {
          totalResults
          nextOffset
          results {
            id
            name
            description
            state
            created
            modified
          }
        }
      }
    `;

    let data = await this.graphql<{ models: any }>(query);
    return data.models;
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
            line1
            line2
            city
            state
            zip
            country
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
    return data.model;
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
    return data.patchModel;
  }

  async updateModelVisibility(modelId: string, visibility: string) {
    let query = `
      mutation toggleModelVisibility($modelId: ID!, $visibility: ModelVisibility!) {
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
    return data.updateModelAccessVisibility;
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
    return data.updateModelState;
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
    return data.model.mattertags;
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
    return data.addMattertag;
  }

  async updateTag(modelId: string, tagId: string, patch: Record<string, any>) {
    let query = `
      mutation patchTag($modelId: ID!, $tagId: ID!, $patch: MattertagDetails!) {
        patchMattertag(modelId: $modelId, field: id, mattertagId: $tagId, patch: $patch) {
          id
        }
      }
    `;

    let data = await this.graphql<{ patchMattertag: any }>(query, { modelId, tagId, patch });
    return data.patchMattertag;
  }

  async deleteTag(modelId: string, tagId: string) {
    let query = `
      mutation deleteTag($modelId: ID!, $tagId: ID!) {
        removeMattertag(modelId: $modelId, field: id, mattertagId: $tagId)
      }
    `;

    let data = await this.graphql<{ removeMattertag: any }>(query, { modelId, tagId });
    return data.removeMattertag;
  }

  // --- Panoramic Imagery ---

  async getSweeps(modelId: string, resolution?: string) {
    let res = resolution || '2k';
    let query = `
      query getSweeps($modelId: ID!) {
        model(id: $modelId) {
          locations {
            id
            position { x y z }
            floor { id }
            room { id }
            panos {
              id
              skybox(resolution: "${res}") {
                id
                status
                format
                children
              }
            }
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { locations: any[] } }>(query, { modelId });
    return data.model.locations;
  }

  // --- Assets ---

  async getFloorplans(modelId: string) {
    let query = `
      query getFloorplans($modelId: ID!) {
        model(id: $modelId) {
          assets {
            floorplans {
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
    return data.model.assets.floorplans;
  }

  async getAssetBundles(modelId: string) {
    let query = `
      query getAssetBundles($modelId: ID!) {
        model(id: $modelId) {
          assets {
            bundles {
              id
              name
              description
              availability
              assets {
                url
                format
              }
            }
          }
        }
      }
    `;

    let data = await this.graphql<{ model: { assets: { bundles: any[] } } }>(query, {
      modelId
    });
    return data.model.assets.bundles;
  }

  async purchaseBundle(modelId: string, bundleId: string, deliverySpeed?: string) {
    let speedArg = deliverySpeed ? `, options: { deliverySpeed: ${deliverySpeed} }` : '';
    let query = `
      mutation purchaseBundle($modelId: ID!) {
        unlockModelBundle(id: $modelId, bundleId: "${bundleId}"${speedArg}) {
          id
          name
          description
          availability
          assets {
            url
          }
        }
      }
    `;

    let data = await this.graphql<{ unlockModelBundle: any }>(query, { modelId });
    return data.unlockModelBundle;
  }

  // --- Dimensions ---

  async getDimensions(modelId: string, units?: string) {
    let unitsArg = units ? `(units: ${units})` : '';
    let query = `
      query getDimensions($modelId: ID!) {
        model(id: $modelId) {
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
            dimensions${unitsArg} {
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

    let data = await this.graphql<{ model: any }>(query, { modelId });
    return data.model;
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
    return data.model.notes;
  }

  // --- Webhooks ---

  async registerWebhook(callbackUrl: string, eventTypes: string[]) {
    let url = new URL(callbackUrl);
    let scheme = url.protocol.replace(':', '');
    let host = url.hostname;
    let port = url.port ? Number.parseInt(url.port, 10) : scheme === 'https' ? 443 : 80;
    let path = url.pathname.replace(/^\//, '');

    let eventTypesStr = eventTypes.join(', ');

    let query = `
      mutation addWebhook {
        addModelEventWebhookCallback(
          input: {
            eventTypes: [${eventTypesStr}]
            callback: {
              scheme: "${scheme}"
              host: "${host}"
              port: ${port}
              path: "${path}"
            }
            version: 2
          }
        ) {
          id
          eventTypes
          callback {
            scheme
            host
            port
            path
          }
          version
        }
      }
    `;

    let data = await this.graphql<{ addModelEventWebhookCallback: any }>(query);
    return data.addModelEventWebhookCallback;
  }

  async unregisterWebhook(callbackId: string) {
    let query = `
      mutation removeWebhook($callbackId: ID!) {
        removeModelEventWebhookCallback(id: $callbackId)
      }
    `;

    await this.graphql(query, { callbackId });
  }

  async listWebhooks() {
    let query = `
      query listWebhooks {
        modelEventWebhookCallbacks {
          totalResults
          nextOffset
          results {
            id
            eventTypes
            callback {
              scheme
              host
              port
              path
            }
            version
          }
        }
      }
    `;

    let data = await this.graphql<{ modelEventWebhookCallbacks: any }>(query);
    return data.modelEventWebhookCallbacks;
  }
}
