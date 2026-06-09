# Fixture: detail backend only

User prompt:

> 给 billing feature 加一个数据导出 API，支持 CSV 和 JSON 格式，按日期范围筛选。纯后端，不需要前端。请做详设合约，不要写代码。

Expected behavior:

- Trigger detail orchestration.
- Load api-design and db-design skills.
- Skip frontend-design — no frontend contract produced.
- Produce API contract (endpoints, request/response schemas, pagination) and database contract (query optimization for date range, export table or view).
- Record "no frontend" as an explicit skip decision in the feature contract.
- Record downstream references between API and database contracts.
