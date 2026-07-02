import { createAxios } from 'slates';

export class CultsClient {
  private authHeader: string;

  constructor(config: { token: string; username: string }) {
    let basicToken = Buffer.from(`${config.username}:${config.token}`).toString('base64');
    this.authHeader = `Basic ${basicToken}`;
  }

  async query<T = any>(graphqlQuery: string, variables?: Record<string, any>): Promise<T> {
    let axios = createAxios({
      baseURL: 'https://cults3d.com'
    });

    let body: Record<string, any> = { query: graphqlQuery };
    if (variables) {
      body.variables = variables;
    }

    let response = await axios.post('/graphql', body, {
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json'
      }
    });

    let data = response.data;

    if (data.errors && data.errors.length > 0) {
      throw new Error(`GraphQL error: ${data.errors.map((e: any) => e.message).join(', ')}`);
    }

    return data.data as T;
  }

  // === Creations ===

  async searchCreations(params: { searchQuery: string; limit?: number; offset?: number }) {
    let query = `
      query SearchCreations($query: String!, $limit: Int, $offset: Int) {
        creationsSearchBatch(query: $query, limit: $limit, offset: $offset) {
          total
          results {
            identifier
            name(locale: EN)
            url(locale: EN)
            shortUrl
            publishedAt
            illustrationImageUrl
            downloadsCount
            likesCount
            viewsCount(cached: true)
            madeWithAi
            tags(locale: EN)
            creator {
              nick
              shortUrl
            }
            category {
              name(locale: EN)
            }
            price(currency: USD) {
              value
            }
          }
        }
      }
    `;

    let result = await this.query<{
      creationsSearchBatch: {
        total: number;
        results: any[];
      };
    }>(query, {
      query: params.searchQuery,
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    });

    return result.creationsSearchBatch;
  }

  async browseCreations(params: {
    limit?: number;
    offset?: number;
    sort?: string;
    direction?: string;
    onlyFree?: boolean;
    onlyPriced?: boolean;
    onlyDiscounted?: boolean;
    submittedAfter?: string;
    submittedBefore?: string;
    madeWithAi?: boolean;
  }) {
    let args: string[] = [];
    let varDefs: string[] = [];

    if (params.limit !== undefined) {
      varDefs.push('$limit: Int');
      args.push('limit: $limit');
    }
    if (params.offset !== undefined) {
      varDefs.push('$offset: Int');
      args.push('offset: $offset');
    }
    if (params.sort !== undefined) {
      varDefs.push('$sort: CreationSort');
      args.push('sort: $sort');
    }
    if (params.direction !== undefined) {
      varDefs.push('$direction: SortDirection');
      args.push('direction: $direction');
    }
    if (params.onlyFree !== undefined) {
      varDefs.push('$onlyFree: Boolean');
      args.push('onlyFree: $onlyFree');
    }
    if (params.onlyPriced !== undefined) {
      varDefs.push('$onlyPriced: Boolean');
      args.push('onlyPriced: $onlyPriced');
    }
    if (params.onlyDiscounted !== undefined) {
      varDefs.push('$onlyDiscounted: Boolean');
      args.push('onlyDiscounted: $onlyDiscounted');
    }
    if (params.submittedAfter !== undefined) {
      varDefs.push('$submittedAfter: DateTime');
      args.push('submittedAfter: $submittedAfter');
    }
    if (params.submittedBefore !== undefined) {
      varDefs.push('$submittedBefore: DateTime');
      args.push('submittedBefore: $submittedBefore');
    }
    if (params.madeWithAi !== undefined) {
      varDefs.push('$madeWithAi: Boolean');
      args.push('madeWithAi: $madeWithAi');
    }

    let varDefsStr = varDefs.length > 0 ? `(${varDefs.join(', ')})` : '';
    let argsStr = args.length > 0 ? `(${args.join(', ')})` : '';

    let query = `
      query BrowseCreations${varDefsStr} {
        creationsBatch${argsStr} {
          total
          results {
            identifier
            name(locale: EN)
            url(locale: EN)
            shortUrl
            publishedAt
            illustrationImageUrl
            downloadsCount
            likesCount
            viewsCount(cached: true)
            madeWithAi
            tags(locale: EN)
            creator {
              nick
              shortUrl
            }
            category {
              name(locale: EN)
            }
            price(currency: USD) {
              value
            }
            discount {
              percentage
              endAt
            }
          }
        }
      }
    `;

    let variables: Record<string, any> = {};
    if (params.limit !== undefined) variables.limit = params.limit;
    if (params.offset !== undefined) variables.offset = params.offset;
    if (params.sort !== undefined) variables.sort = params.sort;
    if (params.direction !== undefined) variables.direction = params.direction;
    if (params.onlyFree !== undefined) variables.onlyFree = params.onlyFree;
    if (params.onlyPriced !== undefined) variables.onlyPriced = params.onlyPriced;
    if (params.onlyDiscounted !== undefined) variables.onlyDiscounted = params.onlyDiscounted;
    if (params.submittedAfter !== undefined) variables.submittedAfter = params.submittedAfter;
    if (params.submittedBefore !== undefined)
      variables.submittedBefore = params.submittedBefore;
    if (params.madeWithAi !== undefined) variables.madeWithAi = params.madeWithAi;

    let result = await this.query<{
      creationsBatch: {
        total: number;
        results: any[];
      };
    }>(query, variables);

    return result.creationsBatch;
  }

  async getCreation(slug: string) {
    let query = `
      query GetCreation($slug: String!) {
        creation(slug: $slug) {
          identifier
          name(locale: EN)
          url(locale: EN)
          shortUrl
          publishedAt
          description(locale: EN)
          illustrationImageUrl
          downloadsCount
          likesCount
          viewsCount(cached: false)
          madeWithAi
          visibility
          tags(locale: EN)
          metaTags {
            code
            name(locale: EN)
          }
          creator {
            nick
            shortUrl
            imageUrl
          }
          category {
            id
            name(locale: EN)
          }
          license {
            code
            name(locale: EN)
          }
          price(currency: USD) {
            value
          }
          discount {
            percentage
            endAt
            originalPrice(currency: USD) {
              value
            }
          }
          illustrations {
            imageUrl
            position
          }
          blueprints {
            id
            fileUrl
            imageUrl
            position
          }
          totalSalesAmount(currency: USD) {
            value
          }
        }
      }
    `;

    let result = await this.query<{ creation: any }>(query, { slug });
    return result.creation;
  }

  // === User ===

  async getUser(nick: string) {
    let query = `
      query GetUser($nick: String!) {
        user(nick: $nick) {
          nick
          shortUrl
          bio
          imageUrl
          followersCount
          creationsCount
        }
      }
    `;

    let result = await this.query<{ user: any }>(query, { nick });
    return result.user;
  }

  // === My Profile ===

  async getMyProfile() {
    let query = `
      {
        myself {
          user {
            nick
            shortUrl
            bio
            imageUrl
            followersCount
            creationsCount
          }
        }
      }
    `;

    let result = await this.query<{ myself: { user: any } }>(query);
    return result.myself.user;
  }

  // === My Creations ===

  async getMyCreations(params: {
    limit?: number;
    offset?: number;
    sort?: string;
    direction?: string;
  }) {
    let query = `
      query MyCreations($limit: Int, $offset: Int) {
        myself {
          creationsBatch(limit: $limit, offset: $offset) {
            total
            results {
              identifier
              name(locale: EN)
              url(locale: EN)
              shortUrl
              publishedAt
              illustrationImageUrl
              downloadsCount
              likesCount
              viewsCount(cached: false)
              visibility
              madeWithAi
              tags(locale: EN)
              totalSalesAmount(currency: USD) {
                value
              }
              price(currency: USD) {
                value
              }
              category {
                name(locale: EN)
              }
            }
          }
        }
      }
    `;

    let result = await this.query<{
      myself: {
        creationsBatch: { total: number; results: any[] };
      };
    }>(query, {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    });

    return result.myself.creationsBatch;
  }

  // === Sales ===

  async getMySales(params: { limit?: number; offset?: number; currency?: string }) {
    let currency = params.currency ?? 'USD';

    let query = `
      query MySales($limit: Int, $offset: Int) {
        myself {
          salesBatch(limit: $limit, offset: $offset) {
            total
            results {
              id
              createdAt
              payedOutAt
              income(currency: ${currency}) {
                value
              }
              creation {
                identifier
                name(locale: EN)
                url(locale: EN)
              }
              user {
                nick
              }
              creationViewsCount
              creationLikesCount
              discount {
                percentage
                startAt
                endAt
              }
            }
          }
        }
      }
    `;

    let result = await this.query<{
      myself: {
        salesBatch: { total: number; results: any[] };
      };
    }>(query, {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    });

    return result.myself.salesBatch;
  }

  // === Orders ===

  async getMyOrders(params: { limit?: number; offset?: number }) {
    let query = `
      query MyOrders($limit: Int, $offset: Int) {
        myself {
          ordersBatch(limit: $limit, offset: $offset) {
            total
            results {
              publicId
              createdAt
              price {
                currency
                value
              }
              lines {
                downloadUrl
                creation {
                  identifier
                  name(locale: EN)
                  url(locale: EN)
                }
              }
            }
          }
        }
      }
    `;

    let result = await this.query<{
      myself: {
        ordersBatch: { total: number; results: any[] };
      };
    }>(query, {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    });

    return result.myself.ordersBatch;
  }

  // === Categories ===

  async getCategories() {
    let query = `
      {
        categories {
          id
          name(locale: EN)
          children {
            id
            name(locale: EN)
          }
        }
      }
    `;

    let result = await this.query<{ categories: any[] }>(query);
    return result.categories;
  }

  // === Licenses ===

  async getLicenses() {
    let query = `
      {
        licenses {
          code
          name(locale: EN)
          url(locale: EN)
          availableOnFreeDesigns
          availableOnPricedDesigns
        }
      }
    `;

    let result = await this.query<{ licenses: any[] }>(query);
    return result.licenses;
  }

  // === Mutations ===

  async createCreation(params: {
    name: string;
    description: string;
    imageUrls: string[];
    fileUrls: string[];
    categoryId: string;
    subCategoryIds?: string[];
    downloadPrice?: number;
    currency?: string;
    locale?: string;
    licenseCode?: string;
    tagNames?: string[];
    metaTags?: string[];
    madeWithAi?: boolean;
  }) {
    let argParts: string[] = [];
    let varDefs: string[] = [];

    varDefs.push('$name: String!');
    argParts.push('name: $name');
    varDefs.push('$description: String!');
    argParts.push('description: $description');
    varDefs.push('$imageUrls: [String!]!');
    argParts.push('imageUrls: $imageUrls');
    varDefs.push('$fileUrls: [String!]!');
    argParts.push('fileUrls: $fileUrls');
    varDefs.push('$categoryId: ID!');
    argParts.push('categoryId: $categoryId');

    if (params.subCategoryIds !== undefined) {
      varDefs.push('$subCategoryIds: [ID!]');
      argParts.push('subCategoryIds: $subCategoryIds');
    }
    if (params.downloadPrice !== undefined) {
      varDefs.push('$downloadPrice: Float');
      argParts.push('downloadPrice: $downloadPrice');
    }
    if (params.currency !== undefined) {
      varDefs.push('$currency: Currency');
      argParts.push('currency: $currency');
    }
    if (params.locale !== undefined) {
      varDefs.push('$locale: Locale');
      argParts.push('locale: $locale');
    }
    if (params.licenseCode !== undefined) {
      varDefs.push('$licenseCode: String');
      argParts.push('licenseCode: $licenseCode');
    }
    if (params.tagNames !== undefined) {
      varDefs.push('$tagNames: [String!]');
      argParts.push('tagNames: $tagNames');
    }
    if (params.metaTags !== undefined) {
      varDefs.push('$metaTags: [String!]');
      argParts.push('metaTags: $metaTags');
    }
    if (params.madeWithAi !== undefined) {
      varDefs.push('$madeWithAi: Boolean');
      argParts.push('madeWithAi: $madeWithAi');
    }

    let query = `
      mutation CreateCreation(${varDefs.join(', ')}) {
        createCreation(${argParts.join(', ')}) {
          creation {
            identifier
            name(locale: EN)
            url(locale: EN)
            shortUrl
          }
          errors
        }
      }
    `;

    let variables: Record<string, any> = {
      name: params.name,
      description: params.description,
      imageUrls: params.imageUrls,
      fileUrls: params.fileUrls,
      categoryId: params.categoryId
    };

    if (params.subCategoryIds !== undefined) variables.subCategoryIds = params.subCategoryIds;
    if (params.downloadPrice !== undefined) variables.downloadPrice = params.downloadPrice;
    if (params.currency !== undefined) variables.currency = params.currency;
    if (params.locale !== undefined) variables.locale = params.locale;
    if (params.licenseCode !== undefined) variables.licenseCode = params.licenseCode;
    if (params.tagNames !== undefined) variables.tagNames = params.tagNames;
    if (params.metaTags !== undefined) variables.metaTags = params.metaTags;
    if (params.madeWithAi !== undefined) variables.madeWithAi = params.madeWithAi;

    let result = await this.query<{ createCreation: { creation: any; errors: string[] } }>(
      query,
      variables
    );

    if (result.createCreation.errors && result.createCreation.errors.length > 0) {
      throw new Error(`Failed to create creation: ${result.createCreation.errors.join(', ')}`);
    }

    return result.createCreation.creation;
  }

  async updateCreation(params: {
    creationId: string;
    name?: string;
    description?: string;
    downloadPrice?: number;
    currency?: string;
    licenseCode?: string;
    tagNames?: string[];
    metaTags?: string[];
    madeWithAi?: boolean;
  }) {
    let argParts: string[] = [];
    let varDefs: string[] = [];

    varDefs.push('$id: ID!');
    argParts.push('id: $id');

    if (params.name !== undefined) {
      varDefs.push('$name: String');
      argParts.push('name: $name');
    }
    if (params.description !== undefined) {
      varDefs.push('$description: String');
      argParts.push('description: $description');
    }
    if (params.downloadPrice !== undefined) {
      varDefs.push('$downloadPrice: Float');
      argParts.push('downloadPrice: $downloadPrice');
    }
    if (params.currency !== undefined) {
      varDefs.push('$currency: Currency');
      argParts.push('currency: $currency');
    }
    if (params.licenseCode !== undefined) {
      varDefs.push('$licenseCode: String');
      argParts.push('licenseCode: $licenseCode');
    }
    if (params.tagNames !== undefined) {
      varDefs.push('$tagNames: [String!]');
      argParts.push('tagNames: $tagNames');
    }
    if (params.metaTags !== undefined) {
      varDefs.push('$metaTags: [String!]');
      argParts.push('metaTags: $metaTags');
    }
    if (params.madeWithAi !== undefined) {
      varDefs.push('$madeWithAi: Boolean');
      argParts.push('madeWithAi: $madeWithAi');
    }

    let query = `
      mutation UpdateCreation(${varDefs.join(', ')}) {
        updateCreation(${argParts.join(', ')}) {
          creation {
            identifier
            name(locale: EN)
            url(locale: EN)
            shortUrl
            description(locale: EN)
            visibility
            tags(locale: EN)
            price(currency: USD) {
              value
            }
          }
          errors
        }
      }
    `;

    let variables: Record<string, any> = {
      id: params.creationId
    };

    if (params.name !== undefined) variables.name = params.name;
    if (params.description !== undefined) variables.description = params.description;
    if (params.downloadPrice !== undefined) variables.downloadPrice = params.downloadPrice;
    if (params.currency !== undefined) variables.currency = params.currency;
    if (params.licenseCode !== undefined) variables.licenseCode = params.licenseCode;
    if (params.tagNames !== undefined) variables.tagNames = params.tagNames;
    if (params.metaTags !== undefined) variables.metaTags = params.metaTags;
    if (params.madeWithAi !== undefined) variables.madeWithAi = params.madeWithAi;

    let result = await this.query<{ updateCreation: { creation: any; errors: string[] } }>(
      query,
      variables
    );

    if (result.updateCreation.errors && result.updateCreation.errors.length > 0) {
      throw new Error(`Failed to update creation: ${result.updateCreation.errors.join(', ')}`);
    }

    return result.updateCreation.creation;
  }

  // === Printlists ===

  async getMyPrintlists(params: { limit?: number; offset?: number }) {
    let query = `
      query MyPrintlists($limit: Int, $offset: Int) {
        myself {
          printlistsBatch(limit: $limit, offset: $offset) {
            total
            results {
              id
              url
              name
              public
              position
              creationsBatch(limit: 50) {
                total
                results {
                  identifier
                  name(locale: EN)
                  shortUrl
                  illustrationImageUrl
                }
              }
            }
          }
        }
      }
    `;

    let result = await this.query<{
      myself: {
        printlistsBatch: { total: number; results: any[] };
      };
    }>(query, {
      limit: params.limit ?? 20,
      offset: params.offset ?? 0
    });

    return result.myself.printlistsBatch;
  }

  async createPrintlist(params: { name: string; isPublic?: boolean }) {
    let query = `
      mutation CreatePrintlist($name: String!, $public: Boolean) {
        createPrintlist(name: $name, public: $public) {
          printlist {
            id
            url
            name
            public
          }
          errors
        }
      }
    `;

    let result = await this.query<{ createPrintlist: { printlist: any; errors: string[] } }>(
      query,
      {
        name: params.name,
        public: params.isPublic
      }
    );

    if (result.createPrintlist.errors && result.createPrintlist.errors.length > 0) {
      throw new Error(
        `Failed to create printlist: ${result.createPrintlist.errors.join(', ')}`
      );
    }

    return result.createPrintlist.printlist;
  }

  async updatePrintlist(params: { printlistId: string; name?: string; isPublic?: boolean }) {
    let query = `
      mutation UpdatePrintlist($id: ID!, $name: String, $public: Boolean) {
        updatePrintlist(id: $id, name: $name, public: $public) {
          printlist {
            id
            url
            name
            public
          }
          errors
        }
      }
    `;

    let result = await this.query<{ updatePrintlist: { printlist: any; errors: string[] } }>(
      query,
      {
        id: params.printlistId,
        name: params.name,
        public: params.isPublic
      }
    );

    if (result.updatePrintlist.errors && result.updatePrintlist.errors.length > 0) {
      throw new Error(
        `Failed to update printlist: ${result.updatePrintlist.errors.join(', ')}`
      );
    }

    return result.updatePrintlist.printlist;
  }

  async destroyPrintlist(printlistId: string) {
    let query = `
      mutation DestroyPrintlist($id: ID!) {
        destroyPrintlist(id: $id) {
          errors
        }
      }
    `;

    let result = await this.query<{ destroyPrintlist: { errors: string[] } }>(query, {
      id: printlistId
    });

    if (result.destroyPrintlist.errors && result.destroyPrintlist.errors.length > 0) {
      throw new Error(
        `Failed to destroy printlist: ${result.destroyPrintlist.errors.join(', ')}`
      );
    }
  }

  async addCreationToPrintlist(params: { creationId: string; printlistId: string }) {
    let query = `
      mutation AddToPrintlist($creationId: ID!, $printlistId: ID!) {
        addCreationToPrintlist(creationId: $creationId, printlistId: $printlistId) {
          errors
        }
      }
    `;

    let result = await this.query<{ addCreationToPrintlist: { errors: string[] } }>(query, {
      creationId: params.creationId,
      printlistId: params.printlistId
    });

    if (
      result.addCreationToPrintlist.errors &&
      result.addCreationToPrintlist.errors.length > 0
    ) {
      throw new Error(
        `Failed to add creation to printlist: ${result.addCreationToPrintlist.errors.join(', ')}`
      );
    }
  }

  async removeCreationFromPrintlist(params: { creationId: string; printlistId: string }) {
    let query = `
      mutation RemoveFromPrintlist($creationId: ID!, $printlistId: ID!) {
        removeCreationFromPrintlist(creationId: $creationId, printlistId: $printlistId) {
          errors
        }
      }
    `;

    let result = await this.query<{ removeCreationFromPrintlist: { errors: string[] } }>(
      query,
      {
        creationId: params.creationId,
        printlistId: params.printlistId
      }
    );

    if (
      result.removeCreationFromPrintlist.errors &&
      result.removeCreationFromPrintlist.errors.length > 0
    ) {
      throw new Error(
        `Failed to remove creation from printlist: ${result.removeCreationFromPrintlist.errors.join(', ')}`
      );
    }
  }

  // === Discount ===

  async createDiscount(params: {
    creationId: string;
    discountPercentage: number;
    discountEndAt: string;
  }) {
    let query = `
      mutation CreateDiscount($creationId: ID!, $discountPercentage: Int!, $discountEndAt: DateTime!) {
        createDiscount(creationId: $creationId, discountPercentage: $discountPercentage, discountEndAt: $discountEndAt) {
          creation {
            identifier
            name(locale: EN)
            discount {
              percentage
              endAt
            }
          }
          errors
        }
      }
    `;

    let result = await this.query<{ createDiscount: { creation: any; errors: string[] } }>(
      query,
      {
        creationId: params.creationId,
        discountPercentage: params.discountPercentage,
        discountEndAt: params.discountEndAt
      }
    );

    if (result.createDiscount.errors && result.createDiscount.errors.length > 0) {
      throw new Error(`Failed to create discount: ${result.createDiscount.errors.join(', ')}`);
    }

    return result.createDiscount.creation;
  }

  // === Notifications ===

  async createChangeNotification(params: { creationId: string; text: string }) {
    let query = `
      mutation CreateChangeNotification($creationId: ID!, $text: String!) {
        createChangeNotification(creationId: $creationId, text: $text) {
          errors
        }
      }
    `;

    let result = await this.query<{ createChangeNotification: { errors: string[] } }>(query, {
      creationId: params.creationId,
      text: params.text
    });

    if (
      result.createChangeNotification.errors &&
      result.createChangeNotification.errors.length > 0
    ) {
      throw new Error(
        `Failed to create notification: ${result.createChangeNotification.errors.join(', ')}`
      );
    }
  }
}
