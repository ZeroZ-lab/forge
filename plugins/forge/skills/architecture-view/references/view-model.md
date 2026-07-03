# Architecture View Model

`architecture-view` emits a derived view model. It is not a project fact source.

## Top Level

```js
{
  schemaVersion: 1,
  feature: "feature-slug",
  generatedAt: "ISO timestamp",
  sources: [{ file, line, heading }],
  coverage: [{ id, label, status, summary, sourceRefs }],
  views: {
    modules: { items, edges },
    dataModels: { items },
    interfaces: { items },
    runtime: { items },
    deployment: { items }
  }
}
```

## Status

- `confirmed`: direct source file + heading/line.
- `inferred`: only a dangling `goal.md` pointer to a missing `modules/*.md`.
- `missing`: expected section absent from existing docs.
- `not_applicable`: no source signal says the view applies.

## Source Refs

Every confirmed item must include:

```js
{ file: "docs/features/<feature>/modules/api.md", line: 12, heading: "接口合约" }
```

Renderer tests must fail if a confirmed item has no source ref.
