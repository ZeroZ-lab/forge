# HTML Report Format — improve 候选报告

> improve skill 的候选报告渲染为单个自包含 HTML 文件，写入 `.forge/improve/<scope>/index.html`。**无 CDN、无 Mermaid-via-CDN**；内联 `<style>` + 内联 SVG。理由：`architecture-view` 先例（自包含、无外部资源）+ `diagram-policy` 禁外发服务端渲染（Mermaid CDN 会把内容发外网，违反最小泄露）。

## 脚手架

```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>improve — {{repo name}}</title>
    <style>
      :root {
        --bg: #f7f8fb; --surface: #ffffff; --text: #17202a; --muted: #637083;
        --line: #d8dee8; --green: #15803d; --amber: #b45309; --slate: #475569;
        --rose: #be123c; --deep-bg: #0f172a; --deep-fg: #e2e8f0;
        --radius: 8px; --shadow: 0 10px 28px rgba(23,32,42,.08);
        --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        --sans: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
      }
      body { background: var(--bg); color: var(--text); font-family: var(--sans); margin: 0; }
      main { max-width: 60rem; margin: 0 auto; padding: 3rem 1.5rem; }
      .pill { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em;
              border: 1px solid var(--line); border-radius: 999px; padding: .15rem .6rem; color: var(--muted); }
      .badge { font-size: .7rem; font-weight: 600; border-radius: 4px; padding: .1rem .5rem; color: #fff; }
      .badge.strong { background: var(--green); }
      .badge.worth { background: var(--amber); }
      .badge.spec { background: var(--slate); }
      article { background: var(--surface); border: 1px solid var(--line);
                border-radius: var(--radius); box-shadow: var(--shadow); padding: 1.5rem; margin: 1.5rem 0; }
      .files { font-family: var(--mono); font-size: .85rem; color: var(--muted); }
      .diagram-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
      .diagram { border: 1px solid var(--line); border-radius: 6px; padding: 1rem; min-height: 320px; }
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: var(--rose); }
      .deep { background: linear-gradient(135deg, var(--deep-bg), #1e293b); color: var(--deep-fg); }
      .adr-callout { background: #fffbeb; border-left: 4px solid var(--amber);
                     padding: .5rem .75rem; font-size: .85rem; margin-top: .75rem; }
      @media (max-width: 720px) { .diagram-pair { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <header><!-- repo name, date, legend, derived-view pill --></header>
      <section id="candidates"><!-- 候选卡 --></section>
      <section id="top-recommendation"><!-- 顶部推荐 --></section>
    </main>
  </body>
</html>
```

## Header

repo 名 + 日期 + 紧凑图例：实线框 = module，虚线 = seam，红箭 = leakage，粗深框 = deep module。加 `derived-view · not-fact-source` pill。无介绍段，直接进候选。

## 候选卡

每张候选是一个 `<article>`：

- **Title** — 短，命名加深（如「合并 Order intake 管线」）。
- **Badge 行** — 强度（Strong=emerald / Worth exploring=amber / Speculative=slate）+ 依赖类别 tag（in-process / local-substitutable / ports & adapters / mock）。
- **Files** — mono 列表（`<div class="files">`）。
- **Before / After 图** — 核心。两列并排（`.diagram-pair`），内联 SVG，~320px 高。见下文图式。
- **Problem** — 一句。哪疼。
- **Solution** — 一句。改什么。
- **Wins** — bullet，每条 ≤6 词，用 glossary 词：`locality: bug 集中一处`、`leverage: 一个接口 N 调用点`、`删 4 个浅 wrapper`。
- **ADR callout**（可选）— 一行 amber 框：「与 ADR-NNNN 冲突，建议重开因为…」。

图需要段落才能看懂就重画。无解释段落。

## 内联 SVG 图式

挑合适的，混用，别每张都一样。全部手画 SVG，不引 Mermaid 自动布局。

### boxes-and-arrows（Mermaid 布局打架时用）

模块是带边框 `<rect>` 或 `<div>`，箭头是 inline SVG `<line>`/`<path>` 绝对定位在相对容器上。after 图用一个粗边深框（`.deep`）deep module + 灰掉的内内部。

```html
<div class="diagram">
  <svg viewBox="0 0 280 200" width="100%" height="280">
    <rect x="10" y="10" width="80" height="40" rx="4" fill="none" stroke="var(--line)"/>
    <text x="50" y="34" text-anchor="middle" font-size="11">OrderHandler</text>
    <line x1="90" y1="30" x2="120" y2="30" marker-end="url(#arr)"/>
    <line x1="180" y1="60" x2="210" y2="90" class="leak" marker-end="url(#arr)"/>
  </svg>
</div>
```

### cross-section（分层浅薄）

横向 band 堆叠表示调用穿过的层。before：6 层薄带各自啥也没干；after：1 层粗带标合并后的责任。

### mass diagram（接口面 ≈ 实现面 = 浅）

每模块两个矩形：接口面 + 实现面。before：接口矩形≈实现矩形（浅）；after：接口矩形矮、实现矩形高（深）。

### call-graph collapse（调用树塌缩）

before：调用树嵌套框；after：塌成一个框，原内部调用灰掉显示在内。

图状关系（依赖/调用流）也用内联 SVG 手动网格布局，不引 Mermaid。

## Top recommendation

一张大卡。候选名 + 一句为什么 + 锚链接到它的卡（`<a href="#candidate-1">`）。

## 词汇强制

**只用**：module, interface, implementation, depth, deep, shallow, seam, adapter, leverage, locality。

**禁换**：component, service, unit（替 module）· API, signature（替 interface）· boundary（替 seam）· layer, wrapper（替 module）。

**风格例**：

- 「Order intake 模块浅——接口几乎等于实现。」
- 「Pricing 跨 seam 泄漏。」
- 「加深：一个接口，一处测试。」
- 「两个 adapter 证明 seam：prod 用 HTTP，test 用 in-memory。」

Wins bullet 用 glossary 词：`locality: bug 集中一模块`、`leverage: 一个接口 N 调用点`、`接口缩；实现吸 wrapper`。不写「更易维护」「代码更干净」——这些词不在 glossary，不配占位。

无 hedging，无「值得指出的是」。句子能成 bullet 就成 bullet；bullet 能删就删。词不在 glossary 就先找 glossary 里的，别造新词。
