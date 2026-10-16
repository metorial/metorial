import { pickDefined } from 'slates';
import { z } from 'zod';

let text = z.string().nullish();
let number = z.number().nullish();
let named = z.object({ name: text }).passthrough();
let counted = named.extend({ count: number });
let labeled = z.union([z.string(), named]);
let company = named.extend({ id: text, mentions: number });
let person = named.extend({ wikidataId: text, mentions: number });
let sentiment = z
  .object({ positive: number, negative: number, neutral: number })
  .passthrough();
let keyword = named.extend({ weight: number });
let idName = named.extend({ id: text });

export let articleResponse = z
  .object({
    articleId: text,
    title: text,
    description: text,
    url: text,
    imageUrl: text,
    authorsByline: text,
    pubDate: text,
    addDate: text,
    country: text,
    language: text,
    clusterId: text,
    reprint: z.boolean().nullish(),
    summary: text,
    content: text,
    source: z.object({ domain: text }).passthrough().nullish(),
    categories: z.array(named).nullish(),
    topics: z.array(named).nullish(),
    sentiment: sentiment.nullish(),
    labels: z.array(labeled).nullish(),
    people: z.array(person).nullish(),
    companies: z.array(company).nullish(),
    keywords: z.array(keyword).nullish(),
    matchedAuthors: z.array(idName).nullish()
  })
  .passthrough();

export let storyResponse = z
  .object({
    id: text,
    name: text,
    summary: text,
    description: text,
    createdAt: text,
    updatedAt: text,
    uniqueCount: number,
    reprintCount: number,
    totalCount: number,
    categories: z.array(counted).nullish(),
    topics: z.array(counted).nullish(),
    people: z.array(person.extend({ count: number })).nullish(),
    companies: z.array(company.extend({ count: number })).nullish(),
    countries: z.array(counted).nullish(),
    selectedArticles: z.array(articleResponse).nullish(),
    keyArticle: articleResponse.nullish()
  })
  .passthrough();

let wikidataLabel = z.object({ label: text, wikidataId: text }).passthrough();
let wikidataDate = z.object({ time: text }).passthrough();
export let personResponse = z
  .object({
    wikidataId: text,
    name: text,
    description: text,
    aliases: z.array(z.string()).nullish(),
    occupation: z.array(wikidataLabel).nullish(),
    position: z
      .array(
        wikidataLabel.extend({
          employer: wikidataLabel.nullish(),
          startTime: z.union([z.string(), wikidataDate]).nullish(),
          endTime: z.union([z.string(), wikidataDate]).nullish()
        })
      )
      .nullish()
  })
  .passthrough();

export let companyResponse = z
  .object({
    id: text,
    name: text,
    altNames: z.array(z.string()).nullish(),
    domains: z.array(z.string()).nullish(),
    description: text,
    ceo: text,
    industry: text,
    sector: text,
    country: text,
    fullTimeEmployees: number,
    city: text,
    state: text
  })
  .passthrough();

export let journalistResponse = z
  .object({
    id: text,
    name: text,
    title: text,
    description: text,
    bio: text,
    location: text,
    twitterBio: text,
    twitterHandle: text,
    avgMonthlyPosts: number,
    locations: z.array(z.record(z.string(), z.unknown())).nullish(),
    topSources: z.array(counted.extend({ domain: text })).nullish(),
    topCategories: z.array(counted).nullish(),
    topTopics: z.array(counted).nullish(),
    topCountries: z.array(counted).nullish()
  })
  .passthrough();

export let sourceResponse = z
  .object({
    id: text,
    domain: text,
    name: text,
    altNames: z.array(z.string()).nullish(),
    description: text,
    paywall: z.boolean().nullish(),
    avgMonthlyPosts: number,
    topCategories: z.array(counted).nullish(),
    topTopics: z.array(counted).nullish()
  })
  .passthrough();

export let topicResponse = named.passthrough();
export let wikipediaResponse = z
  .object({
    wikiTitle: text,
    title: text,
    content: text,
    summary: text,
    pageviews: number,
    wikidataId: text,
    wikiCode: text,
    wikiRevisionTs: text,
    wikidataInstanceOf: z.array(z.union([z.string(), wikidataLabel])).nullish(),
    categories: z.array(z.string()).nullish(),
    sections: z.array(z.object({ textRaw: text }).passthrough()).nullish()
  })
  .passthrough();

export let limitsResponse = z
  .object({
    data: z
      .object({
        organizationName: text,
        requestsUsed: number,
        requestLimit: number,
        maxPageSize: number,
        paginationLimit: number,
        articleContentTruncation: number,
        since: text,
        lastMadeAt: text,
        resetAt: text,
        subscriptionCancelAt: text
      })
      .passthrough()
  })
  .passthrough();

// The public projections omit unavailable enrichment, while raw retains exact nulls and keys.
let names = (values: z.infer<typeof labeled>[] | null | undefined) =>
  values?.flatMap(value =>
    typeof value === 'string' ? [value] : value.name == null ? [] : [value.name]
  );
let counts = (values: z.infer<typeof counted>[] | null | undefined) =>
  values?.map(value =>
    pickDefined({ name: value.name ?? undefined, count: value.count ?? undefined })
  );

export let formatArticle = (value: z.infer<typeof articleResponse>) =>
  pickDefined({
    articleId: value.articleId ?? undefined,
    title: value.title ?? undefined,
    description: value.description ?? undefined,
    url: value.url ?? undefined,
    imageUrl: value.imageUrl ?? undefined,
    authorsByline: value.authorsByline ?? undefined,
    pubDate: value.pubDate ?? undefined,
    addDate: value.addDate ?? undefined,
    sourceDomain: value.source?.domain ?? undefined,
    country: value.country ?? undefined,
    language: value.language ?? undefined,
    clusterId: value.clusterId ?? undefined,
    reprint: value.reprint ?? undefined,
    categories: names(value.categories),
    topics: names(value.topics),
    sentiment:
      value.sentiment == null
        ? undefined
        : pickDefined({
            positive: value.sentiment.positive ?? undefined,
            negative: value.sentiment.negative ?? undefined,
            neutral: value.sentiment.neutral ?? undefined
          }),
    labels: names(value.labels),
    summary: value.summary ?? undefined,
    content: value.content ?? undefined,
    matchedAuthors: value.matchedAuthors?.map(author =>
      pickDefined({
        id: author.id ?? undefined,
        name: author.name ?? undefined
      })
    ),
    people: value.people?.map(person =>
      pickDefined({
        wikidataId: person.wikidataId ?? undefined,
        name: person.name ?? undefined,
        mentions: person.mentions ?? undefined
      })
    ),
    companies: value.companies?.map(company =>
      pickDefined({
        companyId: company.id ?? undefined,
        name: company.name ?? undefined,
        mentions: company.mentions ?? undefined
      })
    ),
    keywords: value.keywords?.map(keyword =>
      pickDefined({
        name: keyword.name ?? undefined,
        weight: keyword.weight ?? undefined
      })
    )
  });

export let formatStory = (value: z.infer<typeof storyResponse>) =>
  pickDefined({
    storyId: value.id ?? undefined,
    name: value.name ?? undefined,
    summary: value.summary ?? undefined,
    description: value.description ?? undefined,
    createdAt: value.createdAt ?? undefined,
    updatedAt: value.updatedAt ?? undefined,
    uniqueCount: value.uniqueCount ?? undefined,
    reprintCount: value.reprintCount ?? undefined,
    totalCount: value.totalCount ?? undefined,
    categories: counts(value.categories),
    topics: counts(value.topics),
    countries: counts(value.countries),
    people: value.people?.map(person =>
      pickDefined({
        wikidataId: person.wikidataId ?? undefined,
        name: person.name ?? undefined,
        count: person.count ?? undefined
      })
    ),
    companies: value.companies?.map(company =>
      pickDefined({
        companyId: company.id ?? undefined,
        name: company.name ?? undefined,
        count: company.count ?? undefined
      })
    ),
    keyArticleTitle:
      value.keyArticle?.title ?? value.selectedArticles?.[0]?.title ?? undefined,
    keyArticleUrl: value.keyArticle?.url ?? value.selectedArticles?.[0]?.url ?? undefined
  });

export let formatPerson = (value: z.infer<typeof personResponse>) =>
  pickDefined({
    wikidataId: value.wikidataId ?? undefined,
    name: value.name ?? undefined,
    description: value.description ?? undefined,
    aliases: value.aliases ?? undefined,
    occupations: value.occupation?.flatMap(item =>
      typeof item === 'string' ? [item] : item.label == null ? [] : [item.label]
    ),
    positions: value.position?.map(position =>
      pickDefined({
        role: position.label ?? undefined,
        employer: position.employer?.label ?? undefined,
        startTime:
          typeof position.startTime === 'string'
            ? position.startTime
            : (position.startTime?.time ?? undefined),
        endTime:
          typeof position.endTime === 'string'
            ? position.endTime
            : (position.endTime?.time ?? undefined)
      })
    )
  });

export let formatCompany = (value: z.infer<typeof companyResponse>) =>
  pickDefined({
    companyId: value.id ?? undefined,
    name: value.name ?? undefined,
    altNames: value.altNames ?? undefined,
    domains: value.domains ?? undefined,
    description: value.description ?? undefined,
    ceo: value.ceo ?? undefined,
    industry: value.industry ?? undefined,
    sector: value.sector ?? undefined,
    country: value.country ?? undefined,
    fullTimeEmployees: value.fullTimeEmployees ?? undefined,
    city: value.city ?? undefined,
    state: value.state ?? undefined
  });

export let formatJournalist = (value: z.infer<typeof journalistResponse>) =>
  pickDefined({
    journalistId: value.id ?? undefined,
    name: value.name ?? undefined,
    title: value.title ?? undefined,
    bio: value.bio ?? value.description ?? undefined,
    location: value.location ?? undefined,
    twitterHandle: value.twitterHandle ?? undefined,
    avgMonthlyPosts: value.avgMonthlyPosts ?? undefined,
    topSources: value.topSources?.map(source =>
      pickDefined({
        name: source.name ?? undefined,
        domain: source.domain ?? undefined,
        count: source.count ?? undefined
      })
    ),
    topCategories: counts(value.topCategories),
    topTopics: counts(value.topTopics),
    topCountries: counts(value.topCountries)
  });

export let formatSource = (value: z.infer<typeof sourceResponse>) => ({
  ...pickDefined({
    sourceId: value.id ?? undefined,
    domain: value.domain ?? undefined,
    name: value.name ?? undefined,
    altNames: value.altNames ?? undefined,
    description: value.description ?? undefined,
    avgMonthlyPosts: value.avgMonthlyPosts ?? undefined,
    topCategories: counts(value.topCategories),
    topTopics: counts(value.topTopics)
  }),
  paywall: value.paywall ?? null
});

export let formatWikipedia = (value: z.infer<typeof wikipediaResponse>) => {
  let sections = value.sections?.flatMap(section =>
    section.textRaw == null ? [] : [section.textRaw]
  );
  return pickDefined({
    title: value.wikiTitle ?? value.title ?? undefined,
    summary: value.summary ?? undefined,
    content: value.content ?? (sections?.length ? sections.join('\n\n') : undefined),
    pageviews: value.pageviews ?? undefined,
    wikidataId: value.wikidataId ?? undefined,
    wikiCode: value.wikiCode ?? undefined,
    wikiRevisionTs: value.wikiRevisionTs ?? undefined,
    wikidataInstanceOf: value.wikidataInstanceOf?.flatMap(item =>
      typeof item === 'string' ? [item] : item.label == null ? [] : [item.label]
    ),
    categories: value.categories ?? undefined
  });
};
