import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentClient } from '../lib/client';
import { spec } from '../spec';

let rankingDataSchema = z
  .object({
    geoLocationId: z.string().optional(),
    rankingString: z.string().optional(),
    geoLocationName: z.string().optional(),
    rankingOutOf: z.number().optional(),
    ranking: z.number().optional()
  })
  .optional();

let subratingSchema = z.object({
  name: z.string().optional(),
  localizedName: z.string().optional(),
  ratingImageUrl: z.string().optional(),
  value: z.number().optional()
});

let awardSchema = z.object({
  awardType: z.string().optional(),
  year: z.number().optional(),
  displayName: z.string().optional(),
  categories: z.array(z.string()).optional()
});

let tripTypeSchema = z.object({
  name: z.string().optional(),
  localizedName: z.string().optional(),
  value: z.string().optional()
});

let cuisineSchema = z.object({
  name: z.string().optional(),
  localizedName: z.string().optional()
});

let hoursSchema = z
  .object({
    weekdayText: z.array(z.string()).optional()
  })
  .optional();

let categorySchema = z
  .object({
    name: z.string().optional(),
    localizedName: z.string().optional()
  })
  .optional();

let neighborhoodSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().optional()
});

export let getLocationDetails = SlateTool.create(spec, {
  name: 'Get Location Details',
  key: 'get_location_details',
  description: `Retrieve comprehensive details about a specific Tripadvisor location. Returns name, address, rating, ranking, reviews count, hours, amenities, cuisine, awards, trip types, subratings, and links to the Tripadvisor listing. Use a location ID obtained from the search tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      locationId: z.string().describe('Tripadvisor location ID'),
      language: z
        .string()
        .optional()
        .describe('Language code for results (overrides global config)'),
      currency: z
        .string()
        .optional()
        .describe('ISO 4217 currency code (overrides global config)')
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      name: z.string().optional(),
      description: z.string().optional(),
      webUrl: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      writeReviewUrl: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      timezone: z.string().optional(),
      rating: z.number().optional(),
      ratingImageUrl: z.string().optional(),
      numReviews: z.string().optional(),
      reviewRatingCount: z.record(z.string(), z.string()).optional(),
      priceLevel: z.string().optional(),
      photoCount: z.number().optional(),
      seeAllPhotosUrl: z.string().optional(),
      address: z
        .object({
          street1: z.string().optional(),
          street2: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          country: z.string().optional(),
          postalcode: z.string().optional(),
          addressString: z.string().optional()
        })
        .optional(),
      rankingData: rankingDataSchema,
      subratings: z.array(subratingSchema).optional(),
      awards: z.array(awardSchema).optional(),
      tripTypes: z.array(tripTypeSchema).optional(),
      cuisine: z.array(cuisineSchema).optional(),
      hours: hoursSchema,
      amenities: z.array(z.string()).optional(),
      features: z.array(z.string()).optional(),
      category: categorySchema,
      subcategory: z.array(categorySchema).optional(),
      styles: z.array(z.string()).optional(),
      neighborhoodInfo: z.array(neighborhoodSchema).optional(),
      brand: z.string().optional(),
      parentBrand: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentClient({
      token: ctx.auth.token,
      language: ctx.config.language,
      currency: ctx.config.currency
    });

    let loc = await client.getLocationDetails(
      ctx.input.locationId,
      ctx.input.language,
      ctx.input.currency
    );

    let subratings: Array<{
      name?: string;
      localizedName?: string;
      ratingImageUrl?: string;
      value?: number;
    }> = [];
    if (loc.subratings) {
      for (let key of Object.keys(loc.subratings)) {
        let sub = loc.subratings[key];
        subratings.push({
          name: sub.name,
          localizedName: sub.localized_name,
          ratingImageUrl: sub.rating_image_url,
          value: sub.value
        });
      }
    }

    let output = {
      locationId: String(loc.location_id),
      name: loc.name,
      description: loc.description,
      webUrl: loc.web_url,
      phone: loc.phone,
      email: loc.email,
      website: loc.website,
      writeReviewUrl: loc.write_review,
      latitude: loc.latitude ? Number(loc.latitude) : undefined,
      longitude: loc.longitude ? Number(loc.longitude) : undefined,
      timezone: loc.timezone,
      rating: loc.rating ? Number(loc.rating) : undefined,
      ratingImageUrl: loc.rating_image_url,
      numReviews: loc.num_reviews,
      reviewRatingCount: loc.review_rating_count,
      priceLevel: loc.price_level,
      photoCount: loc.photo_count,
      seeAllPhotosUrl: loc.see_all_photos,
      address: loc.address_obj
        ? {
            street1: loc.address_obj.street1,
            street2: loc.address_obj.street2,
            city: loc.address_obj.city,
            state: loc.address_obj.state,
            country: loc.address_obj.country,
            postalcode: loc.address_obj.postalcode,
            addressString: loc.address_obj.address_string
          }
        : undefined,
      rankingData: loc.ranking_data
        ? {
            geoLocationId: loc.ranking_data.geo_location_id
              ? String(loc.ranking_data.geo_location_id)
              : undefined,
            rankingString: loc.ranking_data.ranking_string,
            geoLocationName: loc.ranking_data.geo_location_name,
            rankingOutOf: loc.ranking_data.ranking_out_of,
            ranking: loc.ranking_data.ranking
          }
        : undefined,
      subratings: subratings.length > 0 ? subratings : undefined,
      awards: loc.awards?.map((a: any) => ({
        awardType: a.award_type,
        year: a.year,
        displayName: a.display_name,
        categories: a.categories
      })),
      tripTypes: loc.trip_types?.map((t: any) => ({
        name: t.name,
        localizedName: t.localized_name,
        value: t.value
      })),
      cuisine: loc.cuisine?.map((c: any) => ({
        name: c.name,
        localizedName: c.localized_name
      })),
      hours: loc.hours
        ? {
            weekdayText: loc.hours.weekday_text
          }
        : undefined,
      amenities: loc.amenities,
      features: loc.features,
      category: loc.category
        ? {
            name: loc.category.name,
            localizedName: loc.category.localized_name
          }
        : undefined,
      subcategory: loc.subcategory?.map((s: any) => ({
        name: s.name,
        localizedName: s.localized_name
      })),
      styles: loc.styles,
      neighborhoodInfo: loc.neighborhood_info?.map((n: any) => ({
        locationId: String(n.location_id),
        name: n.name
      })),
      brand: loc.brand,
      parentBrand: loc.parent_brand
    };

    let ratingStr = output.rating
      ? ` (${output.rating}/5, ${output.numReviews || 0} reviews)`
      : '';
    let rankStr = output.rankingData?.rankingString
      ? ` - ${output.rankingData.rankingString}`
      : '';

    return {
      output,
      message: `Retrieved details for **${output.name}**${ratingStr}${rankStr}.`
    };
  })
  .build();
