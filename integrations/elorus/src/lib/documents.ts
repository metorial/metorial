import { createApiServiceError } from 'slates';

export let getInvoiceDueDays = (date: string, dueDate: string) => {
  let parseDate = (value: string) => {
    let parsed = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      throw createApiServiceError('Invoice dates must be valid YYYY-MM-DD dates.', {
        reason: 'invalid_invoice_date'
      });
    }
    return parsed.getTime();
  };
  let days = (parseDate(dueDate) - parseDate(date)) / 86400000;
  if (days < 0 || days > 2147483647) {
    throw createApiServiceError('The due date must be on or after the invoice date.', {
      reason: 'invalid_invoice_due_date'
    });
  }
  return days;
};
