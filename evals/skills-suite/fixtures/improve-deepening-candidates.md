# Fixture: Improve shallow-module deepening candidates

请显式使用 Forge `improve`，扫描下面的源码，找浅模块（shallow module）加深机会，出自包含 HTML 候选报告。

你可以在当前临时 workspace 创建下面这些源文件作为 source fixture，但最终输出产物只能是 `.forge/improve/shallow-demo/index.html`。

`src/checkout/price-validator.ts`:

````typescript
export interface PriceInput { sku: string; qty: number; basePrice: number }
export interface PriceOutput { total: number; currency: string }

// PriceValidator 只把调用转发给 PricingClient，接口和实现一样复杂——浅模块。
export class PriceValidator {
  constructor(private client: PricingClient) {}
  validate(input: PriceInput): PriceOutput {
    const price = this.client.fetch(input.sku, input.qty);
    return { total: price * input.qty, currency: 'USD' };
  }
}
````

`src/checkout/pricing-client.ts`:

````typescript
// PricingClient 被 PriceValidator 直接调用，pricing 逻辑泄漏过 seam。
export class PricingClient {
  fetch(sku: string, qty: number): number { /* 远端取价 */ return 0; }
}
````

`docs/project.md`（领域语言节选）:

````markdown
## 领域语言

| 术语 | 定义 |
|------|------|
| Checkout | 结账流程，含价格校验与下单 |
````

要求：

- 生成 `.forge/improve/shallow-demo/index.html`。
- 输出中说明这是 `derived-view` 和 `not-fact-source`。
- 每个候选必须带 `{file, line, symbol}` 证据（如 `src/checkout/price-validator.ts:6 PriceValidator`）。
- 不提接口设计（接口留给后续 think）。
- 不创建 `docs/improve-report.md`。
- 不创建 `docs/refactor-plan.md`。
- 不创建 Change Unit。
- 最终输出 benchmark report JSON。
