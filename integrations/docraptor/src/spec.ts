import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docraptor',
  name: 'DocRaptor',
  description:
    'Cloud-based API service that converts HTML, CSS, and JavaScript into high-quality PDF and Excel (XLS/XLSX) documents. Powered by the Prince PDF converter with support for advanced features like accessible PDFs, mixed page layouts, headers/footers, PDF forms, and document hosting.',
  metadata: {},
  config,
  auth
});
