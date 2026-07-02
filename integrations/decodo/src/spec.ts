import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'decodo',
  name: 'Decodo',
  description:
    'Smartproxy (Decodo) provides residential, mobile, ISP, and datacenter proxies along with a Web Scraping API with 100+ pre-built templates for extracting structured data from eCommerce, search engines, and social media platforms.',
  metadata: {},
  config,
  auth
});
