import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'carbone',
  name: 'Carbone',
  description:
    'Document generation engine that merges JSON data into templates (DOCX, XLSX, PPTX, ODT, ODS, HTML, XML) to produce documents in PDF, DOCX, XLSX, CSV, XML, and more.',
  metadata: {},
  config,
  auth
});
