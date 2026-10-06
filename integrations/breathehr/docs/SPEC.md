# Breathe HR API coverage

API version v1; API-key authentication in X-API-KEY. Production is https://api.breathehr.com/v1, sandbox is https://api.sandbox.breathehr.info/v1. Keys and selected environments must match. Account identity is discovered through GET /account, without a configured opaque account ID.

| Tools | Documented resource |
| --- | --- |
| get_account | Account identity |
| list_employees,get_employee,create_employee | Employee directory, exact records and current required creation fields |
| list_absences,cancel_absence | Filtered absence pages and verified retained cancellation |
| list_leave_requests,manage_leave_request | Leave pages, creation, exact read, approval and rejection |
| list_sicknesses,create_sickness | Sickness pages and creation using a configured type ID |
| manage_expense,manage_expense_claim | Expense/claim discovery, exact reads, creation, claim decision and confirmed deletion |
| list_bonuses,list_salaries | Compensation read access |
| list_organization,get_department_data | Organization discovery and department-scoped records |
| list_training | Training types and course records |
| list_working_patterns,list_holiday_allowances,list_other_leave_reasons | Unpaged configuration discovery |

Responses use named record arrays, including exact-resource reads. Missing expected arrays are failures, rather than empty successes. Account object compatibility requires a real identity. Paged resources use Link and Total headers; the default is25 records and maximum100. Page links are validated against the configured resource and host and never followed as arbitrary URLs. Paging inputs are rejected for current unpaged configuration resources.

Creation and mutation use current Swagger parameter roots. Employee email/company_join_date, sickness company_sicknesstype_id, expense company_expense_type_id/payable_to_employee, claim employee_expense_ids, and claim decision approve/approver_rejector_id are validated. Existing optional schema fields remain optional, with provider-required invocation checks. Supported numeric-ID/string-money fields preserve their public types. Legacy unsupported options fail locally with remediation.

Legal/personnel/financial history and notification effects can survive cancellation or deletion. The private suite requires explicit synthetic sandbox identity and authorization for any isolated lifecycle. No employee deletion, general HR administration, payroll, documents or event capability is exposed. Live provider acceptance and undocumented response details remain subject to verification with authorized fixtures.

Primary sources: https://developer.breathehr.com/documentation/getting_started ; https://api.breathehr.com/v1/swagger_doc ; https://developer.breathehr.com/documentation/authenticating ; https://developer.breathehr.com/documentation/environments ; https://developer.breathehr.com/documentation/request_and_response/root_object?partial=root_object ; https://developer.breathehr.com/documentation/request_and_response/pagination?partial=pagination .
