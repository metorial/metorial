import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPhotoAlbum = SlateTool.create(spec, {
  name: 'Get Photo Album',
  key: 'get_photo_album',
  description: `Retrieve a multi-image post (photo album) from the directory by group ID or by querying a specific property.
Covers photo albums, products, digital products, properties, and classifieds.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.string().optional().describe('The portfolio group ID to look up directly.'),
      property: z
        .string()
        .optional()
        .describe('The column/field name to search by. Used when groupId is not provided.'),
      propertyValue: z
        .string()
        .optional()
        .describe('The value to match for the given property.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      album: z.any().describe('The photo album record(s) returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result: any;
    if (ctx.input.groupId) {
      result = await client.getPortfolioGroup(ctx.input.groupId);
    } else if (ctx.input.property && ctx.input.propertyValue) {
      result = await client.getPortfolioGroupByProperty(
        ctx.input.property,
        ctx.input.propertyValue
      );
    } else {
      throw new Error('Either groupId or both property and propertyValue must be provided.');
    }

    return {
      output: {
        status: result.status,
        album: result.message
      },
      message: `Retrieved photo album data successfully.`
    };
  })
  .build();

export let createPhotoAlbum = SlateTool.create(spec, {
  name: 'Create Photo Album',
  key: 'create_photo_album',
  description: `Create a new multi-image post (photo album) in the directory.
Supports photo albums, products, digital products, properties, and classifieds with multiple images.`
})
  .input(
    z.object({
      userId: z.string().describe('The member ID who owns the album.'),
      dataId: z.string().describe('The post type (data category) ID.'),
      dataType: z
        .string()
        .optional()
        .describe('The data type identifier. Defaults to "4" for multi-image.'),
      groupName: z.string().optional().describe('Name of the album/group.'),
      groupDescription: z.string().optional().describe('Description of the album.'),
      groupLocation: z.string().optional().describe('Location associated with the album.'),
      groupCategory: z.string().optional().describe('Category of the album.'),
      groupStatus: z.string().optional().describe('Status (e.g., "active", "pending").'),
      postImage: z.string().optional().describe('Comma-separated image URLs for the album.'),
      postTags: z.string().optional().describe('Comma-separated tags.'),
      autoImageImport: z.boolean().optional().describe('Whether to auto-import images.'),
      propertyStatus: z
        .string()
        .optional()
        .describe('Property status (for real estate listings).'),
      propertyType: z.string().optional().describe('Property type.'),
      propertyPrice: z.string().optional().describe('Property price.'),
      propertyBeds: z.string().optional().describe('Number of bedrooms.'),
      propertyBaths: z.string().optional().describe('Number of bathrooms.'),
      propertySqrFoot: z.string().optional().describe('Square footage.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      album: z.any().describe('The newly created album record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      user_id: ctx.input.userId,
      data_id: ctx.input.dataId,
      data_type: ctx.input.dataType || '4'
    };

    if (ctx.input.groupName) data.group_name = ctx.input.groupName;
    if (ctx.input.groupDescription) data.group_desc = ctx.input.groupDescription;
    if (ctx.input.groupLocation) data.group_location = ctx.input.groupLocation;
    if (ctx.input.groupCategory) data.group_category = ctx.input.groupCategory;
    if (ctx.input.groupStatus) data.group_status = ctx.input.groupStatus;
    if (ctx.input.postImage) data.post_image = ctx.input.postImage;
    if (ctx.input.postTags) data.post_tags = ctx.input.postTags;
    if (ctx.input.autoImageImport !== undefined)
      data.auto_image_import = ctx.input.autoImageImport ? '1' : '0';
    if (ctx.input.propertyStatus) data.property_status = ctx.input.propertyStatus;
    if (ctx.input.propertyType) data.property_type = ctx.input.propertyType;
    if (ctx.input.propertyPrice) data.property_price = ctx.input.propertyPrice;
    if (ctx.input.propertyBeds) data.property_beds = ctx.input.propertyBeds;
    if (ctx.input.propertyBaths) data.property_baths = ctx.input.propertyBaths;
    if (ctx.input.propertySqrFoot) data.property_sqr_foot = ctx.input.propertySqrFoot;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.createPortfolioGroup(data);

    return {
      output: {
        status: result.status,
        album: result.message
      },
      message: `Created photo album${ctx.input.groupName ? ` **"${ctx.input.groupName}"**` : ''}.`
    };
  })
  .build();

export let updatePhotoAlbum = SlateTool.create(spec, {
  name: 'Update Photo Album',
  key: 'update_photo_album',
  description: `Update an existing multi-image post (photo album) in the directory. Only one album can be updated at a time.`,
  constraints: ['Only one album can be updated at a time.']
})
  .input(
    z.object({
      groupId: z.string().describe('The portfolio group ID to update.'),
      dataId: z.string().describe('The post type (data category) ID.'),
      groupName: z.string().optional().describe('Updated name.'),
      groupDescription: z.string().optional().describe('Updated description.'),
      groupLocation: z.string().optional().describe('Updated location.'),
      groupCategory: z.string().optional().describe('Updated category.'),
      groupStatus: z.string().optional().describe('Updated status.'),
      postTags: z.string().optional().describe('Updated comma-separated tags.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      album: z.any().describe('The updated album record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      group_id: ctx.input.groupId,
      data_id: ctx.input.dataId
    };

    if (ctx.input.groupName) data.group_name = ctx.input.groupName;
    if (ctx.input.groupDescription) data.group_desc = ctx.input.groupDescription;
    if (ctx.input.groupLocation) data.group_location = ctx.input.groupLocation;
    if (ctx.input.groupCategory) data.group_category = ctx.input.groupCategory;
    if (ctx.input.groupStatus) data.group_status = ctx.input.groupStatus;
    if (ctx.input.postTags) data.post_tags = ctx.input.postTags;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updatePortfolioGroup(data);

    return {
      output: {
        status: result.status,
        album: result.message
      },
      message: `Updated photo album **${ctx.input.groupId}**.`
    };
  })
  .build();

export let deletePhotoAlbum = SlateTool.create(spec, {
  name: 'Delete Photo Album',
  key: 'delete_photo_album',
  description: `Permanently delete a multi-image post (photo album) and its related data from the directory.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      groupId: z.string().describe('The portfolio group ID to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deletePortfolioGroup(ctx.input.groupId);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted photo album **${ctx.input.groupId}**.`
    };
  })
  .build();

export let searchPhotoAlbums = SlateTool.create(spec, {
  name: 'Search Photo Albums',
  key: 'search_photo_albums',
  description: `Search for multi-image posts (photo albums) in the directory. Supports keyword, category, location, price, and property-specific filters.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Keyword search query.'),
      category: z.string().optional().describe('Category filter.'),
      address: z.string().optional().describe('Location/address filter.'),
      propertyStatus: z.string().optional().describe('Property status filter.'),
      bedrooms: z.string().optional().describe('Number of bedrooms filter.'),
      bathrooms: z.string().optional().describe('Number of bathrooms filter.'),
      price: z.string().optional().describe('Price filter.'),
      limit: z.number().optional().describe('Number of results per page (20-100).'),
      page: z.string().optional().describe('Pagination token.'),
      outputType: z.enum(['array', 'html']).optional().describe('Output format.'),
      additionalFilters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional search filters.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      albums: z.any().describe('The search results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.category) params.category = ctx.input.category;
    if (ctx.input.address) params.address = ctx.input.address;
    if (ctx.input.propertyStatus) params.property_status = ctx.input.propertyStatus;
    if (ctx.input.bedrooms) params.bedrooms = ctx.input.bedrooms;
    if (ctx.input.bathrooms) params.bathrooms = ctx.input.bathrooms;
    if (ctx.input.price) params.price = ctx.input.price;
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.outputType) params.output_type = ctx.input.outputType;
    if (ctx.input.additionalFilters) {
      for (let [key, value] of Object.entries(ctx.input.additionalFilters)) {
        params[key] = value;
      }
    }

    let result = await client.searchPortfolioGroups(params);

    return {
      output: {
        status: result.status,
        albums: result.message
      },
      message: `Found photo albums matching the search criteria.`
    };
  })
  .build();
