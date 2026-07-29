# Fixture: Guide 只推荐最短链路

请显式使用 Forge `guide` 判断下面任务应该走哪条链路：

> 已有项目的设置页把按钮文案从“保存设置”改成“保存”，不改变行为、接口、数据或验收语义。

要求：

- 给出 D10 复杂度和调用深度。
- 先判断 direct action 是否已经足够；允许推荐零 Skill。
- 说明为什么跳过 define、detail、codegen、plan、test、review、deploy。
- 明确“零 Skill 合法”，不把 Skill 激活作为完成条件。
- 只输出路由建议，不调用其他 Forge skill，不修改文件，不创建 Change Unit。
- 最终输出 benchmark report JSON。
