# CHANGELOG

* 支持编译阶段捕获语法错误具体行
* 低于 IE9 的浏览器需要使用 ECMA5 补丁以及 JSON 库支持
* 辅助方法 `helpers` 更名为 `imports`
* `onerror` 选项可以定制输出的调试信息
* `parser` 回调函数第三个参数接收 `tokens`
* 非编码输出由 `<%=#value%>` 改为 `<%-value>`（依然兼容旧版本的语法）
* `template.config()` 方法取消，请直接读写 `template.defaults`
