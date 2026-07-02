import { createAxios } from 'slates';

export class Client {
  private token: string;
  private publicationHost: string;

  constructor(config: { token: string; publicationHost: string }) {
    this.token = config.token;
    this.publicationHost = config.publicationHost;
  }

  private getAxios() {
    return createAxios({
      baseURL: 'https://gql.hashnode.com'
    });
  }

  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<T> {
    let ax = this.getAxios();
    let response = await ax.post(
      '/',
      {
        query,
        variables
      },
      {
        headers: {
          Authorization: this.token,
          'Content-Type': 'application/json'
        }
      }
    );

    let body = response.data;
    if (body.errors && body.errors.length > 0) {
      throw new Error(body.errors.map((e: any) => e.message).join('; '));
    }

    return body.data as T;
  }

  // ─── Publication ───────────────────────────────────────────────

  async getPublication() {
    let data = await this.graphql(
      `
      query Publication($host: String!) {
        publication(host: $host) {
          id
          title
          displayTitle
          descriptionSEO
          about { markdown html }
          url
          canonicalURL
          favicon
          headerColor
          isTeam
          author {
            id
            username
            name
            profilePicture
          }
        }
      }
    `,
      { host: this.publicationHost }
    );
    return data.publication;
  }

  async getPublicationId(): Promise<string> {
    let pub = await this.getPublication();
    return pub.id;
  }

  // ─── Posts ─────────────────────────────────────────────────────

  async listPosts(options: { first?: number; after?: string; tagSlugs?: string[] } = {}) {
    let { first = 10, after, tagSlugs } = options;
    let filter = tagSlugs && tagSlugs.length > 0 ? { tagSlugs } : undefined;

    let data = await this.graphql(
      `
      query PostsByPublication($host: String!, $first: Int!, $after: String, $filter: PublicationPostConnectionFilter) {
        publication(host: $host) {
          posts(first: $first, after: $after, filter: $filter) {
            edges {
              node {
                id
                title
                slug
                url
                brief
                publishedAt
                updatedAt
                readTimeInMinutes
                reactionCount
                responseCount
                author {
                  id
                  username
                  name
                  profilePicture
                }
                coverImage { url }
                tags { id name slug }
                series { id name }
                seo { title description }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalDocuments
          }
        }
      }
    `,
      { host: this.publicationHost, first, after, filter }
    );

    let connection = data.publication?.posts;
    return {
      posts: (connection?.edges || []).map((e: any) => e.node),
      pageInfo: connection?.pageInfo,
      totalDocuments: connection?.totalDocuments
    };
  }

  async getPost(postId: string) {
    let data = await this.graphql(
      `
      query Post($id: ID!) {
        post(id: $id) {
          id
          title
          subtitle
          slug
          url
          brief
          publishedAt
          updatedAt
          readTimeInMinutes
          reactionCount
          responseCount
          content { markdown html }
          coverImage { url }
          author {
            id
            username
            name
            profilePicture
          }
          tags { id name slug }
          series { id name }
          seo { title description }
          ogMetaData { image }
        }
      }
    `,
      { id: postId }
    );
    return data.post;
  }

  async getPostBySlug(slug: string) {
    let data = await this.graphql(
      `
      query PostBySlug($host: String!, $slug: String!) {
        publication(host: $host) {
          post(slug: $slug) {
            id
            title
            subtitle
            slug
            url
            brief
            publishedAt
            updatedAt
            readTimeInMinutes
            reactionCount
            responseCount
            content { markdown html }
            coverImage { url }
            author {
              id
              username
              name
              profilePicture
            }
            tags { id name slug }
            series { id name }
            seo { title description }
            ogMetaData { image }
          }
        }
      }
    `,
      { host: this.publicationHost, slug }
    );
    return data.publication?.post;
  }

  async publishPost(input: {
    title: string;
    contentMarkdown: string;
    subtitle?: string;
    slug?: string;
    tags?: { id?: string; name?: string; slug?: string }[];
    coverImageURL?: string;
    originalArticleURL?: string;
    seriesId?: string;
    disableComments?: boolean;
    enableTableOfContent?: boolean;
    isNewsletterActivated?: boolean;
    publishedAt?: string;
  }) {
    let publicationId = await this.getPublicationId();
    let publishInput: Record<string, any> = {
      publicationId,
      title: input.title,
      contentMarkdown: input.contentMarkdown
    };

    if (input.subtitle) publishInput.subtitle = input.subtitle;
    if (input.slug) publishInput.slug = input.slug;
    if (input.tags) publishInput.tags = input.tags;
    if (input.coverImageURL)
      publishInput.coverImageOptions = { coverImageURL: input.coverImageURL };
    if (input.originalArticleURL) publishInput.originalArticleURL = input.originalArticleURL;
    if (input.seriesId) publishInput.seriesId = input.seriesId;
    if (input.disableComments !== undefined)
      publishInput.disableComments = input.disableComments;
    if (input.enableTableOfContent !== undefined)
      publishInput.enableTableOfContent = input.enableTableOfContent;
    if (input.isNewsletterActivated !== undefined)
      publishInput.isNewsletterActivated = input.isNewsletterActivated;
    if (input.publishedAt) publishInput.publishedAt = input.publishedAt;

    let data = await this.graphql(
      `
      mutation PublishPost($input: PublishPostInput!) {
        publishPost(input: $input) {
          post {
            id
            title
            slug
            url
          }
        }
      }
    `,
      { input: publishInput }
    );

    return data.publishPost?.post;
  }

  async updatePost(
    postId: string,
    input: {
      title?: string;
      contentMarkdown?: string;
      subtitle?: string;
      slug?: string;
      tags?: { id?: string; name?: string; slug?: string }[];
      coverImageURL?: string;
      originalArticleURL?: string;
      seriesId?: string;
      disableComments?: boolean;
      enableTableOfContent?: boolean;
      publishedAt?: string;
    }
  ) {
    let updateInput: Record<string, any> = { id: postId };

    if (input.title !== undefined) updateInput.title = input.title;
    if (input.contentMarkdown !== undefined)
      updateInput.contentMarkdown = input.contentMarkdown;
    if (input.subtitle !== undefined) updateInput.subtitle = input.subtitle;
    if (input.slug !== undefined) updateInput.slug = input.slug;
    if (input.tags !== undefined) updateInput.tags = input.tags;
    if (input.coverImageURL !== undefined)
      updateInput.coverImageOptions = { coverImageURL: input.coverImageURL };
    if (input.originalArticleURL !== undefined)
      updateInput.originalArticleURL = input.originalArticleURL;
    if (input.seriesId !== undefined) updateInput.seriesId = input.seriesId;
    if (input.disableComments !== undefined)
      updateInput.disableComments = input.disableComments;
    if (input.enableTableOfContent !== undefined)
      updateInput.enableTableOfContent = input.enableTableOfContent;
    if (input.publishedAt !== undefined) updateInput.publishedAt = input.publishedAt;

    let data = await this.graphql(
      `
      mutation UpdatePost($input: UpdatePostInput!) {
        updatePost(input: $input) {
          post {
            id
            title
            slug
            url
          }
        }
      }
    `,
      { input: updateInput }
    );

    return data.updatePost?.post;
  }

  async removePost(postId: string) {
    let data = await this.graphql(
      `
      mutation RemovePost($input: RemovePostInput!) {
        removePost(input: $input) {
          post {
            id
          }
        }
      }
    `,
      { input: { id: postId } }
    );

    return data.removePost?.post;
  }

  // ─── Drafts ────────────────────────────────────────────────────

  async listDrafts(options: { first?: number; after?: string } = {}) {
    let { first = 10, after } = options;

    let data = await this.graphql(
      `
      query Drafts($host: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          drafts(first: $first, after: $after) {
            edges {
              node {
                id
                title
                slug
                updatedAt
                author {
                  id
                  username
                  name
                }
                tags { id name slug }
                content { markdown }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
      { host: this.publicationHost, first, after }
    );

    let connection = data.publication?.drafts;
    return {
      drafts: (connection?.edges || []).map((e: any) => e.node),
      pageInfo: connection?.pageInfo
    };
  }

  async getDraft(draftId: string) {
    let data = await this.graphql(
      `
      query Draft($id: ObjectId!) {
        draft(id: $id) {
          id
          title
          slug
          updatedAt
          content { markdown }
          author {
            id
            username
            name
          }
          tags { id name slug }
        }
      }
    `,
      { id: draftId }
    );
    return data.draft;
  }

  async createDraft(input: {
    title: string;
    contentMarkdown: string;
    subtitle?: string;
    slug?: string;
    tags?: { id?: string; name?: string; slug?: string }[];
    coverImageURL?: string;
  }) {
    let publicationId = await this.getPublicationId();
    let draftInput: Record<string, any> = {
      publicationId,
      title: input.title,
      contentMarkdown: input.contentMarkdown
    };

    if (input.subtitle) draftInput.subtitle = input.subtitle;
    if (input.slug) draftInput.slug = input.slug;
    if (input.tags) draftInput.tags = input.tags;
    if (input.coverImageURL)
      draftInput.coverImageOptions = { coverImageURL: input.coverImageURL };

    let data = await this.graphql(
      `
      mutation CreateDraft($input: CreateDraftInput!) {
        createDraft(input: $input) {
          draft {
            id
            title
            slug
          }
        }
      }
    `,
      { input: draftInput }
    );

    return data.createDraft?.draft;
  }

  async publishDraft(draftId: string) {
    let data = await this.graphql(
      `
      mutation PublishDraft($input: PublishDraftInput!) {
        publishDraft(input: $input) {
          post {
            id
            title
            slug
            url
          }
        }
      }
    `,
      { input: { draftId } }
    );

    return data.publishDraft?.post;
  }

  // ─── Series ────────────────────────────────────────────────────

  async listSeries(options: { first?: number; after?: string } = {}) {
    let { first = 10, after } = options;

    let data = await this.graphql(
      `
      query SeriesList($host: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          seriesList(first: $first, after: $after) {
            edges {
              node {
                id
                name
                slug
                createdAt
                description { markdown }
                coverImage
                sortOrder
                author {
                  id
                  username
                  name
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalDocuments
          }
        }
      }
    `,
      { host: this.publicationHost, first, after }
    );

    let connection = data.publication?.seriesList;
    return {
      series: (connection?.edges || []).map((e: any) => e.node),
      pageInfo: connection?.pageInfo,
      totalDocuments: connection?.totalDocuments
    };
  }

  async getSeriesBySlug(slug: string) {
    let data = await this.graphql(
      `
      query SeriesBySlug($host: String!, $slug: String!) {
        publication(host: $host) {
          series(slug: $slug) {
            id
            name
            slug
            createdAt
            description { markdown html }
            coverImage
            sortOrder
            author {
              id
              username
              name
            }
            posts(first: 20) {
              edges {
                node {
                  id
                  title
                  slug
                  url
                }
              }
              totalDocuments
            }
          }
        }
      }
    `,
      { host: this.publicationHost, slug }
    );
    return data.publication?.series;
  }

  async createSeries(input: {
    name: string;
    slug?: string;
    description?: string;
    coverImage?: string;
    sortOrder?: string;
  }) {
    let publicationId = await this.getPublicationId();
    let seriesInput: Record<string, any> = {
      publicationId,
      name: input.name
    };

    if (input.slug) seriesInput.slug = input.slug;
    if (input.description) seriesInput.description = { markdown: input.description };
    if (input.coverImage) seriesInput.coverImage = input.coverImage;
    if (input.sortOrder) seriesInput.sortOrder = input.sortOrder;

    let data = await this.graphql(
      `
      mutation CreateSeries($input: CreateSeriesInput!) {
        createSeries(input: $input) {
          series {
            id
            name
            slug
            createdAt
          }
        }
      }
    `,
      { input: seriesInput }
    );

    return data.createSeries?.series;
  }

  async updateSeries(
    seriesId: string,
    input: {
      name?: string;
      slug?: string;
      description?: string;
      coverImage?: string;
      sortOrder?: string;
    }
  ) {
    let seriesInput: Record<string, any> = { id: seriesId };

    if (input.name !== undefined) seriesInput.name = input.name;
    if (input.slug !== undefined) seriesInput.slug = input.slug;
    if (input.description !== undefined)
      seriesInput.description = { markdown: input.description };
    if (input.coverImage !== undefined) seriesInput.coverImage = input.coverImage;
    if (input.sortOrder !== undefined) seriesInput.sortOrder = input.sortOrder;

    let data = await this.graphql(
      `
      mutation UpdateSeries($input: UpdateSeriesInput!) {
        updateSeries(input: $input) {
          series {
            id
            name
            slug
          }
        }
      }
    `,
      { input: seriesInput }
    );

    return data.updateSeries?.series;
  }

  async removeSeries(seriesId: string) {
    let data = await this.graphql(
      `
      mutation RemoveSeries($input: RemoveSeriesInput!) {
        removeSeries(input: $input) {
          series {
            id
          }
        }
      }
    `,
      { input: { id: seriesId } }
    );

    return data.removeSeries?.series;
  }

  // ─── Comments ──────────────────────────────────────────────────

  async getComments(postId: string, options: { first?: number; after?: string } = {}) {
    let { first = 10, after } = options;

    let data = await this.graphql(
      `
      query Post($id: ID!, $first: Int!, $after: String) {
        post(id: $id) {
          comments(first: $first, after: $after) {
            edges {
              node {
                id
                content { markdown html }
                author {
                  id
                  username
                  name
                  profilePicture
                }
                dateAdded
                totalReactions
                replies(first: 5) {
                  edges {
                    node {
                      id
                      content { markdown html }
                      author {
                        id
                        username
                        name
                        profilePicture
                      }
                      dateAdded
                      totalReactions
                    }
                  }
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
            totalDocuments
          }
        }
      }
    `,
      { id: postId, first, after }
    );

    let connection = data.post?.comments;
    return {
      comments: (connection?.edges || []).map((e: any) => ({
        ...e.node,
        replies: (e.node.replies?.edges || []).map((r: any) => r.node)
      })),
      pageInfo: connection?.pageInfo,
      totalDocuments: connection?.totalDocuments
    };
  }

  async addComment(postId: string, contentMarkdown: string) {
    let data = await this.graphql(
      `
      mutation AddComment($input: AddCommentInput!) {
        addComment(input: $input) {
          comment {
            id
            content { markdown html }
            author {
              id
              username
              name
            }
            dateAdded
          }
        }
      }
    `,
      { input: { postId, contentMarkdown } }
    );

    return data.addComment?.comment;
  }

  async addReply(commentId: string, contentMarkdown: string) {
    let data = await this.graphql(
      `
      mutation AddReply($input: AddReplyInput!) {
        addReply(input: $input) {
          reply {
            id
            content { markdown html }
            author {
              id
              username
              name
            }
            dateAdded
          }
        }
      }
    `,
      { input: { commentId, contentMarkdown } }
    );

    return data.addReply?.reply;
  }

  async removeComment(commentId: string) {
    let data = await this.graphql(
      `
      mutation RemoveComment($input: RemoveCommentInput!) {
        removeComment(input: $input) {
          comment {
            id
          }
        }
      }
    `,
      { input: { id: commentId } }
    );

    return data.removeComment?.comment;
  }

  async removeReply(commentId: string, replyId: string) {
    let data = await this.graphql(
      `
      mutation RemoveReply($input: RemoveReplyInput!) {
        removeReply(input: $input) {
          reply {
            id
          }
        }
      }
    `,
      { input: { commentId, replyId } }
    );

    return data.removeReply?.reply;
  }

  // ─── Static Pages ─────────────────────────────────────────────

  async listStaticPages(options: { first?: number; after?: string } = {}) {
    let { first = 10, after } = options;

    let data = await this.graphql(
      `
      query StaticPages($host: String!, $first: Int!, $after: String) {
        publication(host: $host) {
          staticPages(first: $first, after: $after) {
            edges {
              node {
                id
                title
                slug
                hidden
                content { markdown html }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
      { host: this.publicationHost, first, after }
    );

    let connection = data.publication?.staticPages;
    return {
      staticPages: (connection?.edges || []).map((e: any) => e.node),
      pageInfo: connection?.pageInfo
    };
  }

  async getStaticPageById(pageId: string) {
    // Hashnode doesn't have a direct static page by ID query;
    // we list and filter as a workaround.
    let pages = await this.listStaticPages({ first: 50 });
    return pages.staticPages.find((p: any) => p.id === pageId);
  }

  async getStaticPageBySlug(slug: string) {
    let data = await this.graphql(
      `
      query StaticPage($host: String!, $slug: String!) {
        publication(host: $host) {
          staticPage(slug: $slug) {
            id
            title
            slug
            hidden
            content { markdown html }
          }
        }
      }
    `,
      { host: this.publicationHost, slug }
    );

    return data.publication?.staticPage;
  }

  // ─── User ─────────────────────────────────────────────────────

  async getUser(username: string) {
    let data = await this.graphql(
      `
      query User($username: String!) {
        user(username: $username) {
          id
          username
          name
          profilePicture
          tagline
          bio { markdown }
          followersCount
          followingsCount
          location
          dateJoined
          availableFor
          socialMediaLinks {
            website
            github
            twitter
            instagram
            facebook
            stackoverflow
            linkedin
            youtube
          }
        }
      }
    `,
      { username }
    );

    return data.user;
  }

  async getMe() {
    let data = await this.graphql(`
      query Me {
        me {
          id
          username
          name
          email
          profilePicture
          tagline
          bio { markdown }
          followersCount
          followingsCount
          location
          dateJoined
          availableFor
          socialMediaLinks {
            website
            github
            twitter
            instagram
            facebook
            stackoverflow
            linkedin
            youtube
          }
        }
      }
    `);

    return data.me;
  }

  // ─── Newsletter ────────────────────────────────────────────────

  async subscribeToNewsletter(email: string) {
    let publicationId = await this.getPublicationId();

    let data = await this.graphql(
      `
      mutation SubscribeToNewsletter($input: SubscribeToNewsletterInput!) {
        subscribeToNewsletter(input: $input) {
          status
        }
      }
    `,
      { input: { publicationId, email } }
    );

    return data.subscribeToNewsletter;
  }

  // ─── Webhooks ──────────────────────────────────────────────────

  async createWebhook(input: { url: string; events: string[]; secret: string }) {
    let publicationId = await this.getPublicationId();

    let data = await this.graphql(
      `
      mutation CreateWebhook($input: CreateWebhookInput!) {
        createWebhook(input: $input) {
          webhook {
            id
            url
            events
            secret
            createdAt
          }
        }
      }
    `,
      {
        input: {
          publicationId,
          url: input.url,
          events: input.events,
          secret: input.secret
        }
      }
    );

    return data.createWebhook?.webhook;
  }

  async deleteWebhook(webhookId: string) {
    let data = await this.graphql(
      `
      mutation DeleteWebhook($id: ID!) {
        deleteWebhook(id: $id) {
          webhook {
            id
          }
        }
      }
    `,
      { id: webhookId }
    );

    return data.deleteWebhook?.webhook;
  }

  // ─── Search ────────────────────────────────────────────────────

  async searchPosts(query: string, options: { first?: number; after?: string } = {}) {
    let { first = 10, after } = options;

    let data = await this.graphql(
      `
      query SearchPosts($host: String!, $first: Int!, $after: String, $filter: SearchPostsOfPublicationFilter!) {
        publication(host: $host) {
          searchPostsOfPublication(first: $first, after: $after, filter: $filter) {
            edges {
              node {
                id
                title
                slug
                url
                brief
                publishedAt
                author {
                  id
                  username
                  name
                }
                coverImage { url }
                tags { id name slug }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `,
      { host: this.publicationHost, first, after, filter: { query } }
    );

    let connection = data.publication?.searchPostsOfPublication;
    return {
      posts: (connection?.edges || []).map((e: any) => e.node),
      pageInfo: connection?.pageInfo
    };
  }
}
