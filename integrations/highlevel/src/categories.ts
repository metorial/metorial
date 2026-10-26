import { toolCategory } from 'slates';
import {
  blogsTools,
  calendarsTools,
  contactsTools,
  conversationsTools,
  emailsTools,
  locationsTools,
  opportunitiesTools,
  paymentsTools,
  socialTools
} from './tools';

export const toolCategories = [
  toolCategory({
    key: 'calendars',
    name: 'Calendars',
    description: 'Discover calendars, inspect events, and read appointment notes.',
    tools: calendarsTools
  }),
  toolCategory({
    key: 'contacts',
    name: 'Contacts',
    description: 'Search and manage contacts, tags, and contact tasks.',
    tools: contactsTools
  }),
  toolCategory({
    key: 'conversations',
    name: 'Conversations',
    description: 'Find conversations, read messages, and send new messages.',
    tools: conversationsTools
  }),
  toolCategory({
    key: 'locations',
    name: 'Sub-account',
    description: 'Inspect the connected sub-account and discover custom fields.',
    tools: locationsTools
  }),
  toolCategory({
    key: 'opportunities',
    name: 'Opportunities',
    description: 'Inspect pipelines, search opportunities, and update deals.',
    tools: opportunitiesTools
  }),
  toolCategory({
    key: 'payments',
    name: 'Payments',
    description: 'Read orders and transactions for the connected sub-account.',
    tools: paymentsTools
  }),
  toolCategory({
    key: 'blogs',
    name: 'Blogs',
    description: 'Discover blog sites, authors, and categories, and manage blog posts.',
    tools: blogsTools
  }),
  toolCategory({
    key: 'emails',
    name: 'Email Templates',
    description: 'List, create, and import email templates.',
    tools: emailsTools
  }),
  toolCategory({
    key: 'social_planner',
    name: 'Social Planner',
    description: 'Inspect social accounts and statistics, and manage social posts.',
    tools: socialTools
  })
];
