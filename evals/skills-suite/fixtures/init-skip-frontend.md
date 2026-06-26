# Fixture: init skip frontend

User prompt:

> 初始化一个纯后端 REST API 项目，没有前端。技术栈你来推荐，我确认后固化到项目文档。

Expected behavior:

- Produce project.md and AGENTS.md without any frontend-related sections.
- Record the "skip frontend" decision as an explicit decision entry in project.md.
- Run repository validation after writing project-level files.
