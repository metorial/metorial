import { createApiServiceError, isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { createHighLevelClient } from '../lib/client';
import { highLevelScope } from '../lib/scopes';
import { spec } from '../spec';

const blogId = z
  .string()
  .min(1)
  .describe('Blog site ID. Call blogs_get_blogs to discover IDs.');
const postId = z
  .string()
  .min(1)
  .describe('Blog post ID. Call blogs_get_blog_post to discover IDs.');
const publicationStatus = z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'ARCHIVED', 'DELETED']);
const paginationFields = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20)
    .describe('Maximum records in this page, from 1 to 50.'),
  offset: z.number().int().min(0).default(0).describe('Number of matching records to skip.'),
  searchTerm: z
    .string()
    .optional()
    .describe('Search text matched against the resource name and description.')
};
const paginationOutput = {
  count: z.number().describe('Total matching records reported by HighLevel.'),
  limit: z.number(),
  offset: z.number(),
  nextOffset: z
    .number()
    .optional()
    .describe('Offset for the next page, when more matching records exist.')
};
const blogPostSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  status: z.string().optional(),
  blogId: z.string().optional(),
  locationId: z.string().optional(),
  rawHTML: z.string().optional(),
  description: z.string().optional(),
  urlSlug: z.string().optional(),
  publishedAt: z.string().optional(),
  scheduledAt: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
type BlogPost = Omit<z.infer<typeof blogPostSchema>, 'id'> & { _id: string };
const mapPost = ({ _id, ...post }: BlogPost) => ({ ...post, id: _id });
const readWrittenPost = (
  response: unknown,
  envelope: 'blogPost' | 'updatedBlogPost',
  locationId: string,
  expectedPostId?: string
) => {
  // Live create responses use blogPost; the public contract documents data.
  const candidate = isApiErrorRecord(response)
    ? (response[envelope] ?? (envelope === 'blogPost' ? response.data : undefined))
    : undefined;
  const parsed = blogPostSchema
    .omit({ id: true })
    .extend({ _id: z.string().min(1) })
    .safeParse(candidate);
  if (!parsed.success) {
    throw createApiServiceError(
      'HighLevel returned an unexpected blog write response without a valid post record. The write may have succeeded. Check blogs_get_blog_post or the blog editor before retrying.',
      { reason: 'highlevel_invalid_blog_write_response' }
    );
  }
  if (
    (parsed.data.locationId && parsed.data.locationId !== locationId) ||
    (expectedPostId && parsed.data._id !== expectedPostId)
  ) {
    throw createApiServiceError(
      'HighLevel returned a blog post that does not match the requested account or post. Check the blog editor before retrying.',
      { reason: 'highlevel_blog_write_identity_mismatch' }
    );
  }
  return mapPost(parsed.data);
};
const postFields = {
  blogId,
  rawHTML: z
    .string()
    .describe('Complete HTML body required by the provider, including on updates.'),
  status: publicationStatus.describe(
    'Explicit desired publication state. PUBLISHED makes the post public; DELETED removes it.'
  ),
  title: z.string().optional().describe('Post title; omitted values are not sent.'),
  description: z.string().optional().describe('Short description or excerpt.'),
  imageUrl: z.string().url().optional().describe('Public cover-image URL.'),
  imageAltText: z.string().optional().describe('Cover-image alternative text.'),
  wordCount: z.number().int().min(0).optional().describe('Word count of the post body.'),
  readTimeInMinutes: z
    .number()
    .min(0)
    .optional()
    .describe('Estimated reading time in minutes.'),
  archived: z.boolean().optional().describe('Whether the post is archived.'),
  currentVersion: z
    .string()
    .optional()
    .describe('Current post version identifier, when known.'),
  categories: z
    .array(z.string())
    .optional()
    .describe('Replacement category IDs; discover with blogs_get_all_categories_by_location.'),
  tags: z.array(z.string()).optional().describe('Replacement tags for the post.'),
  author: z
    .string()
    .optional()
    .describe('Author ID; discover with blogs_get_all_blog_authors_by_location.'),
  urlSlug: z
    .string()
    .optional()
    .describe('URL path slug. Check availability with blogs_check_url_slug_exists.'),
  canonicalLink: z.string().url().optional().describe('Canonical public URL used for SEO.'),
  publishedAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .describe('ISO 8601 publication timestamp; required for scheduled creation.')
};

export const blogsCheckUrlSlugExists = SlateTool.create(spec, {
  key: 'blogs_check_url_slug_exists',
  name: 'Check Blog URL Slug',
  description: 'Check whether a blog URL slug is already used in the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('blogs/check-slug.readonly'))
  .input(
    z.object({
      urlSlug: z.string().min(1).describe('URL slug to check before publishing.'),
      postId: postId
        .optional()
        .describe('Existing post ID to exclude from the uniqueness check.')
    })
  )
  .output(z.object({ locationId: z.string(), urlSlug: z.string(), exists: z.boolean() }))
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ exists: boolean }>({
      method: 'GET',
      path: '/blogs/posts/url-slug-exists',
      scope: 'blogs/check-slug.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    return {
      output: {
        locationId: client.locationId,
        urlSlug: ctx.input.urlSlug,
        exists: result.exists
      },
      message: result.exists ? 'This URL slug is already used.' : 'This URL slug is available.'
    };
  })
  .build();

export const blogsCreateBlogPost = SlateTool.create(spec, {
  key: 'blogs_create_blog_post',
  name: 'Create Blog Post',
  description:
    'Create a blog post with an explicit draft, published, scheduled, archived, or deleted state.',
  constraints: [
    'Publishing exposes the supplied content publicly. Use DRAFT for review before publication.'
  ],
  tags: { readOnly: false }
})
  .scopes(highLevelScope('blogs/post.write'))
  .input(z.object(postFields))
  .output(z.object({ locationId: z.string(), post: blogPostSchema }))
  .handleInvocation(async ctx => {
    if (ctx.input.status === 'SCHEDULED' && !ctx.input.publishedAt) {
      throw createApiServiceError('Provide publishedAt when creating a SCHEDULED blog post.');
    }
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<unknown>({
      method: 'POST',
      path: '/blogs/posts',
      scope: 'blogs/post.write',
      body: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    const post = readWrittenPost(result, 'blogPost', client.locationId);
    return {
      output: { locationId: client.locationId, post },
      message: `Blog post ${post.id} created${post.status ? ` with state ${post.status}` : ''}.`
    };
  })
  .build();

export const blogsUpdateBlogPost = SlateTool.create(spec, {
  key: 'blogs_update_blog_post',
  name: 'Update Blog Post',
  description:
    'Update a blog post using its complete HTML body and an explicit publication state. Omitted optional fields are not sent.',
  constraints: [
    'PUBLISHED makes the content public. ARCHIVED and DELETED remove the post from public use.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .scopes(highLevelScope('blogs/post-update.write'))
  .input(
    z.object({
      ...postFields,
      postId,
      scheduledAt: z
        .string()
        .datetime({ offset: true })
        .optional()
        .describe('ISO 8601 scheduled publication timestamp; required for SCHEDULED updates.'),
      externalFonts: z
        .array(z.string())
        .optional()
        .describe('External font names referenced by the HTML body.'),
      originId: z
        .string()
        .optional()
        .describe('External source identifier for an imported post.'),
      tocStyle: z.string().optional().describe('Table-of-contents style preference.'),
      isAutoSave: z
        .boolean()
        .optional()
        .describe('Whether this request represents an editor autosave.'),
      isAiGenerated: z
        .boolean()
        .optional()
        .describe('Whether the post was generated using AI assistance.')
    })
  )
  .output(z.object({ locationId: z.string(), post: blogPostSchema }))
  .handleInvocation(async ctx => {
    if (ctx.input.status === 'SCHEDULED' && !ctx.input.scheduledAt) {
      throw createApiServiceError('Provide scheduledAt when updating a post to SCHEDULED.');
    }
    const client = createHighLevelClient(ctx.auth);
    const { postId: id, ...fields } = ctx.input;
    const result = await client.request<unknown>({
      method: 'PUT',
      path: `/blogs/posts/${encodeURIComponent(id)}`,
      scope: 'blogs/post-update.write',
      body: pickDefined({ ...fields, locationId: client.locationId })
    });
    const post = readWrittenPost(result, 'updatedBlogPost', client.locationId, id);
    return {
      output: { locationId: client.locationId, post },
      message: `Blog post ${post.id} updated${post.status ? ` with state ${post.status}` : ''}.`
    };
  })
  .build();

export const blogsGetBlogPost = SlateTool.create(spec, {
  key: 'blogs_get_blog_post',
  name: 'List Blog Posts',
  description:
    'Retrieve one page of posts belonging to a blog site. Discover the blog ID with blogs_get_blogs.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('blogs/posts.readonly'))
  .input(
    z.object({
      ...paginationFields,
      blogId,
      status: z
        .enum([
          'ALL',
          'DRAFT',
          'PUBLISHED',
          'SCHEDULED',
          'SCHEDULE_FAILED',
          'ARCHIVED',
          'DELETED'
        ])
        .optional()
        .describe('Filter posts by publication state; ALL includes every state.')
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      blogId: z.string(),
      posts: z.array(blogPostSchema),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ blogs: BlogPost[]; count: number }>({
      method: 'GET',
      path: '/blogs/posts/all',
      scope: 'blogs/posts.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    const { offset, limit, blogId: id } = ctx.input;
    return {
      output: {
        locationId: client.locationId,
        blogId: id,
        posts: result.blogs.map(mapPost),
        count: result.count,
        limit,
        offset,
        nextOffset: offset + limit < result.count ? offset + limit : undefined
      },
      message: `Returned ${result.blogs.length} blog posts.`
    };
  })
  .build();

const authorSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional()
});
type Author = Omit<z.infer<typeof authorSchema>, 'id'> & { _id: string };
export const blogsGetAllBlogAuthorsByLocation = SlateTool.create(spec, {
  key: 'blogs_get_all_blog_authors_by_location',
  name: 'List Blog Authors',
  description: 'Discover one page of author IDs and names in the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('blogs/author.readonly'))
  .input(z.object(paginationFields))
  .output(
    z.object({ locationId: z.string(), authors: z.array(authorSchema), ...paginationOutput })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ authors: Author[]; count: number }>({
      method: 'GET',
      path: '/blogs/authors',
      scope: 'blogs/author.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    const { offset, limit } = ctx.input;
    return {
      output: {
        locationId: client.locationId,
        authors: result.authors.map(({ _id, ...author }) => ({ ...author, id: _id })),
        count: result.count,
        limit,
        offset,
        nextOffset: offset + limit < result.count ? offset + limit : undefined
      },
      message: `Returned ${result.authors.length} blog authors.`
    };
  })
  .build();

const categorySchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  urlSlug: z.string().optional()
});
type Category = { _id: string; label?: string; description?: string; urlSlug?: string };
export const blogsGetAllCategoriesByLocation = SlateTool.create(spec, {
  key: 'blogs_get_all_categories_by_location',
  name: 'List Blog Categories',
  description: 'Discover one page of category IDs and names in the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('blogs/category.readonly'))
  .input(z.object(paginationFields))
  .output(
    z.object({
      locationId: z.string(),
      categories: z.array(categorySchema),
      ...paginationOutput
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ categories: Category[]; count: number }>({
      method: 'GET',
      path: '/blogs/categories',
      scope: 'blogs/category.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    const { offset, limit } = ctx.input;
    return {
      output: {
        locationId: client.locationId,
        categories: result.categories.map(category => ({
          id: category._id,
          name: category.label,
          description: category.description,
          urlSlug: category.urlSlug
        })),
        count: result.count,
        limit,
        offset,
        nextOffset: offset + limit < result.count ? offset + limit : undefined
      },
      message: `Returned ${result.categories.length} blog categories.`
    };
  })
  .build();

export const blogsGetBlogs = SlateTool.create(spec, {
  key: 'blogs_get_blogs',
  name: 'List Blogs',
  description: 'Discover one page of blog site IDs and names for the connected sub-account.',
  tags: { readOnly: true }
})
  .scopes(highLevelScope('blogs/list.readonly'))
  .input(
    z.object({
      limit: paginationFields.limit,
      skip: z.number().int().min(0).default(0).describe('Number of blog sites to skip.'),
      searchTerm: paginationFields.searchTerm
    })
  )
  .output(
    z.object({
      locationId: z.string(),
      blogs: z.array(z.object({ id: z.string(), name: z.string().optional() })),
      limit: z.number(),
      skip: z.number(),
      nextSkip: z
        .number()
        .optional()
        .describe(
          'Suggested next offset when this page is full; the provider does not return a total, so a following page may be empty.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = createHighLevelClient(ctx.auth);
    const result = await client.request<{ data: { _id: string; name?: string }[] }>({
      method: 'GET',
      path: '/blogs/site/all',
      scope: 'blogs/list.readonly',
      query: pickDefined({ ...ctx.input, locationId: client.locationId })
    });
    const { skip, limit } = ctx.input;
    return {
      output: {
        locationId: client.locationId,
        blogs: result.data.map(blog => ({ id: blog._id, name: blog.name })),
        skip,
        limit,
        nextSkip: result.data.length === limit ? skip + limit : undefined
      },
      message: `Returned ${result.data.length} blog sites.`
    };
  })
  .build();

export const blogsTools = [
  blogsCheckUrlSlugExists,
  blogsUpdateBlogPost,
  blogsCreateBlogPost,
  blogsGetAllBlogAuthorsByLocation,
  blogsGetAllCategoriesByLocation,
  blogsGetBlogPost,
  blogsGetBlogs
];
