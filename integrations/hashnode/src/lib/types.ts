export interface Content {
  markdown?: string | null;
  html?: string | null;
}
export interface User {
  id: string;
  username: string;
  name?: string | null;
  email?: string | null;
  profilePicture?: string | null;
  tagline?: string | null;
  bio?: Content | null;
  followersCount?: number | null;
  followingsCount?: number | null;
  location?: string | null;
  dateJoined?: string | null;
  availableFor?: string | null;
  socialMediaLinks?: Record<string, string | null> | null;
}
export interface Tag {
  id: string;
  name: string;
  slug: string;
}
export interface PageInfo {
  hasNextPage: boolean;
  endCursor?: string | null;
  totalDocuments?: number | null;
}
export interface Connection<T> {
  edges: { node: T; cursor?: string }[];
  pageInfo: PageInfo;
}
export interface Publication {
  id: string;
  title: string;
  displayTitle?: string | null;
  descriptionSEO?: string | null;
  about?: Content | null;
  url?: string | null;
  canonicalURL?: string | null;
  favicon?: string | null;
  headerColor?: string | null;
  isTeam?: boolean | null;
  author?: User;
  seo?: { title?: string | null; description?: string | null } | null;
  posts?: Connection<Post>;
  drafts?: Connection<Draft>;
  seriesList?: Connection<Series>;
  series?: Series | null;
  staticPages?: Connection<StaticPage>;
  staticPage?: StaticPage | null;
  post?: Post | null;
}
export interface Post {
  id: string;
  title: string;
  slug: string;
  url: string;
  subtitle?: string | null;
  brief?: string | null;
  content?: Content | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  readTimeInMinutes?: number | null;
  reactionCount?: number | null;
  responseCount?: number | null;
  author?: User;
  publication?: Publication | null;
  coverImage?: { url?: string | null } | null;
  tags?: Tag[] | null;
  series?: { id: string; name: string } | null;
  seo?: { title?: string | null; description?: string | null } | null;
  preferences?: { isCommentsDisabled?: boolean | null } | null;
  comments?: Connection<Comment>;
}
export interface Draft {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  slug?: string | null;
  updatedAt?: string | null;
  content?: Content | null;
  author?: User;
  publication?: Publication | null;
  tags?: Tag[] | null;
  coverImage?: { url?: string | null } | null;
}
export interface Series {
  id: string;
  name: string;
  slug: string;
  description?: Content | null;
  coverImage?: string | null;
  author?: User;
  posts?: Connection<Post>;
  createdAt?: undefined;
  sortOrder?: undefined;
}
export interface Comment {
  id: string;
  content?: Content;
  author?: User;
  dateAdded?: string;
  totalReactions?: number;
  replies?: Comment[];
  repliesPageInfo?: PageInfo;
}
export interface StaticPage {
  id: string;
  title: string;
  slug: string;
  hidden: boolean;
  content?: Content;
}
export interface TagInput {
  id?: string;
  name?: string;
  slug?: string;
}
export interface PostInput {
  title?: string;
  contentMarkdown?: string;
  subtitle?: string;
  slug?: string;
  tags?: TagInput[];
  coverImageURL?: string;
  originalArticleURL?: string;
  seriesId?: string;
  disableComments?: boolean;
  enableTableOfContent?: boolean;
  isNewsletterActivated?: boolean;
  publishedAt?: string;
}
