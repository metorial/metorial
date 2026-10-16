import { toolCategory } from 'slates';
import * as tools from './tools';

// Families follow the provider's named API engines and route prefixes. Account
// usage is intentionally outside the data-extraction family selections.
export let toolCategories = [
  toolCategory({
    key: 'website',
    name: 'Website APIs',
    description:
      'HTML crawling, browser rendering, anti-bot unlocking, technology, contacts, and screenshots.',
    tools: [
      tools.scrapeWebsite,
      tools.detectTechnology,
      tools.extractContacts,
      tools.screenshotWebpage,
      tools.captureScreenshot
    ]
  }),
  toolCategory({
    key: 'linkedin',
    name: 'LinkedIn APIs',
    description:
      'Public profiles, companies, posts, jobs, job counts, and location discovery.',
    tools: [
      tools.linkedinCompany,
      tools.linkedinJob,
      tools.linkedinJobSearch,
      tools.linkedinPost,
      tools.linkedinProfile,
      tools.linkedinJobSuggestions,
      tools.linkedinJobCount
    ]
  }),
  toolCategory({
    key: 'google',
    name: 'Google APIs',
    description: 'Google web, news, image, and video search results.',
    tools: [tools.googleSearch]
  }),
  toolCategory({
    key: 'bing-brave',
    name: 'Bing and Brave APIs',
    description: 'Bing and Brave web search results.',
    tools: [tools.webSearch]
  }),
  toolCategory({
    key: 'amazon',
    name: 'Amazon APIs',
    description: 'Amazon marketplace product search, details, and offers.',
    tools: [tools.amazonSearch, tools.amazonProduct]
  }),
  toolCategory({
    key: 'shopify',
    name: 'Shopify API',
    description: 'Public Shopify product details and variants.',
    tools: [tools.shopifyProduct]
  }),
  toolCategory({
    key: 'walmart',
    name: 'Walmart API',
    description: 'Walmart product details, pricing, and availability.',
    tools: [tools.walmartProduct]
  }),
  toolCategory({
    key: 'crunchbase',
    name: 'Crunchbase APIs',
    description: 'Company profiles, entity search, and funding rounds.',
    tools: [tools.crunchbaseCompany, tools.crunchbaseSearch, tools.crunchbaseFundingRounds]
  }),
  toolCategory({
    key: 'company',
    name: 'Company Database API',
    description: 'Company enrichment from a company website domain.',
    tools: [tools.enrichCompany]
  }),
  toolCategory({
    key: 'domain',
    name: 'Domain APIs',
    description: 'WHOIS registration and domain or IP reputation.',
    tools: [tools.domainWhois, tools.checkDomainReputation]
  }),
  toolCategory({
    key: 'email',
    name: 'Email APIs',
    description: 'Email discovery and deliverability verification.',
    tools: [tools.verifyEmail, tools.findEmail]
  }),
  toolCategory({
    key: 'instagram',
    name: 'Instagram APIs',
    description: 'Public Instagram profiles and posts.',
    tools: [tools.instagramProfile, tools.instagramPost]
  }),
  toolCategory({
    key: 'github',
    name: 'GitHub API',
    description: 'Public GitHub profile information.',
    tools: [tools.githubProfile]
  }),
  toolCategory({
    key: 'trustpilot',
    name: 'Trustpilot API',
    description: 'Trustpilot company ratings and contact information.',
    tools: [tools.trustpilotCompany]
  })
];
