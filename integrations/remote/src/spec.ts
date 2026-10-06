import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'remote',
  name: 'Remote',
  description:
    'Read Remote employment records, country forms, leave policies, expenses, incentives, offboarding requests, timesheets, contract amendments, and payslips. Create or update supported employment and review records, download payslip PDFs, and obtain indicative employment cost estimates.',
  metadata: {},
  config,
  auth
});
