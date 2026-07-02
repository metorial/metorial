import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let productReviewSchema = z.object({
  reviewId: z.number(),
  productId: z.number(),
  reviewer: z.string(),
  reviewerEmail: z.string(),
  review: z.string(),
  rating: z.number(),
  status: z.string(),
  verified: z.boolean(),
  dateCreated: z.string()
});

export let manageProductReviews = SlateTool.create(spec, {
  name: 'Manage Product Reviews',
  key: 'manage_product_reviews',
  description: `List, get, create, update, or delete product reviews for catalog moderation and customer feedback workflows.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      reviewId: z
        .number()
        .optional()
        .describe('Product review ID (required for get/update/delete)'),
      page: z.number().optional().default(1).describe('Page number for list'),
      perPage: z.number().optional().default(10).describe('Results per page for list'),
      search: z.string().optional().describe('Search review content'),
      productId: z.number().optional().describe('Product ID for create or list filter'),
      reviewer: z.string().optional().describe('Reviewer display name'),
      reviewerEmail: z.string().optional().describe('Reviewer email address'),
      review: z.string().optional().describe('Review content'),
      rating: z.number().optional().describe('Review rating from 0 to 5'),
      status: z
        .enum(['approved', 'hold', 'spam', 'unspam', 'trash'])
        .optional()
        .describe('Review status'),
      verified: z.boolean().optional().describe('Whether reviewer is a verified owner'),
      orderby: z.enum(['date', 'date_gmt', 'id', 'include', 'product']).optional(),
      order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      force: z.boolean().optional().default(true).describe('Force permanent deletion')
    })
  )
  .output(
    z.object({
      reviews: z.array(productReviewSchema).optional(),
      review: productReviewSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    if (action === 'list') {
      let params: Record<string, any> = {
        page: ctx.input.page,
        per_page: ctx.input.perPage
      };
      if (ctx.input.search) params.search = ctx.input.search;
      if (ctx.input.productId !== undefined) params.product = ctx.input.productId;
      if (ctx.input.status) params.status = ctx.input.status;
      if (ctx.input.reviewer) params.reviewer = ctx.input.reviewer;
      if (ctx.input.reviewerEmail) params.reviewer_email = ctx.input.reviewerEmail;
      if (ctx.input.orderby) params.orderby = ctx.input.orderby;
      if (ctx.input.order) params.order = ctx.input.order;

      let reviews = await client.listProductReviews(params);
      let mapped = (Array.isArray(reviews) ? reviews : []).map((review: any) =>
        mapProductReview(review)
      );
      return {
        output: { reviews: mapped },
        message: `Found **${mapped.length}** product reviews.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.reviewId)
        throw woocommerceServiceError('reviewId is required for get action');
      let review = await client.getProductReview(ctx.input.reviewId);
      return {
        output: { review: mapProductReview(review) },
        message: `Retrieved product review (ID: ${review.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.productId)
        throw woocommerceServiceError('productId is required for create action');
      if (!ctx.input.reviewer)
        throw woocommerceServiceError('reviewer is required for create action');
      if (!ctx.input.reviewerEmail)
        throw woocommerceServiceError('reviewerEmail is required for create action');
      if (!ctx.input.review)
        throw woocommerceServiceError('review is required for create action');
      if (ctx.input.rating === undefined)
        throw woocommerceServiceError('rating is required for create action');

      let data = buildProductReviewData(ctx.input);
      data.product_id = ctx.input.productId;
      data.reviewer = ctx.input.reviewer;
      data.reviewer_email = ctx.input.reviewerEmail;
      data.review = ctx.input.review;
      data.rating = ctx.input.rating;

      let review = await client.createProductReview(data);
      return {
        output: { review: mapProductReview(review) },
        message: `Created product review (ID: ${review.id}) for product ${review.product_id}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.reviewId)
        throw woocommerceServiceError('reviewId is required for update action');
      let review = await client.updateProductReview(
        ctx.input.reviewId,
        buildProductReviewData(ctx.input)
      );
      return {
        output: { review: mapProductReview(review) },
        message: `Updated product review (ID: ${review.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.reviewId)
        throw woocommerceServiceError('reviewId is required for delete action');
      await client.deleteProductReview(ctx.input.reviewId, ctx.input.force);
      return {
        output: { deleted: true },
        message: `Deleted product review (ID: ${ctx.input.reviewId}).`
      };
    }

    throw woocommerceServiceError(`Unknown action: ${action}`);
  })
  .build();

let buildProductReviewData = (input: any) => {
  let data: Record<string, any> = {};
  if (input.productId !== undefined) data.product_id = input.productId;
  if (input.reviewer !== undefined) data.reviewer = input.reviewer;
  if (input.reviewerEmail !== undefined) data.reviewer_email = input.reviewerEmail;
  if (input.review !== undefined) data.review = input.review;
  if (input.rating !== undefined) data.rating = input.rating;
  if (input.status !== undefined) data.status = input.status;
  if (input.verified !== undefined) data.verified = input.verified;
  return data;
};

let mapProductReview = (review: any) => ({
  reviewId: review.id,
  productId: review.product_id || 0,
  reviewer: review.reviewer || '',
  reviewerEmail: review.reviewer_email || '',
  review: review.review || '',
  rating: review.rating || 0,
  status: review.status || '',
  verified: review.verified || false,
  dateCreated: review.date_created || ''
});
