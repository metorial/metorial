import { createApiServiceError } from 'slates';
import { createAuthenticatedAxios } from './client';

export interface RecipeLineItem {
  name: string;
  displayText?: string;
  productIds?: number[];
  upcs?: string[];
  measurements?: Array<{
    quantity?: number;
    unit?: string;
  }>;
  filters?: {
    brandName?: string;
    brandFilters?: string[];
    healthFilters?: string[];
    healthAttributes?: string[];
  };
}

export interface CreateRecipePageParams {
  title: string;
  imageUrl?: string;
  author?: string;
  servings?: number;
  cookingTime?: number;
  externalReferenceId?: string;
  contentCreatorCreditInfo?: string;
  expiresIn?: number;
  instructions?: string[];
  ingredients: RecipeLineItem[];
  landingPageConfiguration?: {
    partnerLinkbackUrl?: string;
    enablePantryItems?: boolean;
  };
}

export interface ShoppingListLineItem {
  name: string;
  quantity?: number;
  unit?: string;
  lineItemMeasurements?: Array<{ quantity?: number; unit?: string }>;
  displayText?: string;
  productIds?: number[];
  upcs?: string[];
  filters?: {
    brandName?: string;
    brandFilters?: string[];
    healthFilters?: string[];
    healthAttributes?: string[];
  };
}

export interface CreateShoppingListPageParams {
  title: string;
  imageUrl?: string;
  linkType?: 'shopping_list' | 'recipe';
  expiresIn?: number;
  instructions?: string[];
  lineItems: ShoppingListLineItem[];
  landingPageConfiguration?: {
    partnerLinkbackUrl?: string;
    enablePantryItems?: boolean;
  };
}

export class IdpClient {
  private token: string;
  private environment: string;

  constructor(config: { token: string; environment: string }) {
    this.token = config.token;
    this.environment = config.environment;
  }

  async createRecipePage(
    params: CreateRecipePageParams
  ): Promise<{ productsLinkUrl: string; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      title: params.title,
      ingredients: params.ingredients.map(item => {
        let lineItem: Record<string, unknown> = { name: item.name };
        if (item.displayText) lineItem.display_text = item.displayText;
        if (item.productIds) lineItem.product_ids = item.productIds;
        if (item.upcs) lineItem.upcs = item.upcs;
        if (item.measurements) {
          lineItem.measurements = item.measurements.map(m => ({
            quantity: m.quantity,
            unit: m.unit
          }));
        }
        if (item.filters) {
          lineItem.filters = {
            brand_filters:
              item.filters.brandFilters ??
              (item.filters.brandName !== undefined ? [item.filters.brandName] : undefined),
            health_filters: item.filters.healthFilters ?? item.filters.healthAttributes
          };
        }
        return lineItem;
      })
    };

    if (params.imageUrl) body.image_url = params.imageUrl;
    if (params.author) body.author = params.author;
    if (params.servings) body.servings = params.servings;
    if (params.cookingTime) body.cooking_time = params.cookingTime;
    if (params.externalReferenceId) body.external_reference_id = params.externalReferenceId;
    if (params.contentCreatorCreditInfo)
      body.content_creator_credit_info = params.contentCreatorCreditInfo;
    if (params.expiresIn) body.expires_in = params.expiresIn;
    if (params.instructions) body.instructions = params.instructions;
    if (params.landingPageConfiguration) {
      body.landing_page_configuration = {
        partner_linkback_url: params.landingPageConfiguration.partnerLinkbackUrl,
        enable_pantry_items: params.landingPageConfiguration.enablePantryItems
      };
    }

    let response = await axios.post('/idp/v1/products/recipe', body);
    if (typeof response.data.products_link_url !== 'string')
      throw createApiServiceError('Instacart did not return a page URL.');
    return { productsLinkUrl: response.data.products_link_url, raw: response.data };
  }

  async createShoppingListPage(
    params: CreateShoppingListPageParams
  ): Promise<{ productsLinkUrl: string; raw: unknown }> {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let body: Record<string, unknown> = {
      title: params.title,
      line_items: params.lineItems.map(item => {
        let lineItem: Record<string, unknown> = { name: item.name };
        if (item.quantity !== undefined) lineItem.quantity = item.quantity;
        if (item.unit) lineItem.unit = item.unit;
        if (item.lineItemMeasurements !== undefined)
          lineItem.line_item_measurements = item.lineItemMeasurements;
        if (item.displayText) lineItem.display_text = item.displayText;
        if (item.productIds) lineItem.product_ids = item.productIds;
        if (item.upcs) lineItem.upcs = item.upcs;
        if (item.filters) {
          lineItem.filters = {
            brand_filters:
              item.filters.brandFilters ??
              (item.filters.brandName !== undefined ? [item.filters.brandName] : undefined),
            health_filters: item.filters.healthFilters ?? item.filters.healthAttributes
          };
        }
        return lineItem;
      })
    };

    if (params.imageUrl) body.image_url = params.imageUrl;
    if (params.linkType) body.link_type = params.linkType;
    if (params.expiresIn) body.expires_in = params.expiresIn;
    if (params.instructions) body.instructions = params.instructions;
    if (params.landingPageConfiguration) {
      body.landing_page_configuration = {
        partner_linkback_url: params.landingPageConfiguration.partnerLinkbackUrl,
        enable_pantry_items: params.landingPageConfiguration.enablePantryItems
      };
    }

    let response = await axios.post('/idp/v1/products/products_link', body);
    if (typeof response.data.products_link_url !== 'string')
      throw createApiServiceError('Instacart did not return a page URL.');
    return { productsLinkUrl: response.data.products_link_url, raw: response.data };
  }

  async getNearbyRetailers(
    postalCode: string,
    countryCode: string
  ): Promise<
    Array<{
      retailerKey?: string;
      name?: string;
      retailerLogoUrl?: string;
      raw?: unknown;
    }>
  > {
    let axios = createAuthenticatedAxios(this.token, this.environment);

    let response = await axios.get('/idp/v1/retailers', {
      params: {
        postal_code: postalCode,
        country_code: countryCode
      }
    });

    let retailers = response.data.retailers || [];
    return retailers.map((r: Record<string, unknown>) => ({
      raw: r,
      retailerKey: r.retailer_key as string | undefined,
      name: r.name as string | undefined,
      retailerLogoUrl: r.retailer_logo_url as string | undefined
    }));
  }
}
