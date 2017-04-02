const jsTokens = require('./js-tokens');
const tplTokens = require('./tpl-tokens');
const isKeyword = require('is-keyword-js');

const DATA = `$data`;
const IMPORTS = `$imports`;
const has = (object, key) => {
    return object.hasOwnProperty(key);
};


class Compiler {
    constructor(source, options) {

        const openTag = options.openTag;
        const closeTag = options.closeTag;
        const filename = options.filename;

        this.source = source;
        this.options = options;

        // 记录编译后生成的代码
        this.scripts = [];

        // 运行时注入的上下文
        this.context = { $out: `""` };

        // 内置特权方法
        this.embedded = {
            print: [
                [], `function(){var text=''.concat.apply('',arguments);return $out+=text}`
            ],
            include: [
                [`$include`], `function(src,data){return $out+=$include(src,data||${DATA},${filename})}`
            ]
        };


        if (options.compileDebug) {
            this.context.$line = `0`;
        }


        tplTokens.parser(source, openTag, closeTag).forEach(token => {
            const type = token.type;
            const value = token.value;
            const line = token.line;
            if (type === `string`) {
                this.addString(value, line);
            } else if (type === `expression`) {
                this.addExpression(value, line);
            }
        });
    }

    // 注入上下文
    addContext(name) {

        let value = ``;
        const embedded = this.embedded;
        const context = this.context;
        const options = this.options;
        const imports = options.imports;

        if (has(context, name) || name === DATA || name === IMPORTS || isKeyword(name)) {
            return;
        }

        if (has(embedded, name)) {
            embedded[name][0].forEach(name => this.addContext(name));
            value = embedded[name][1];
        } else if (has(imports, name)) {
            value = `${IMPORTS}.${name}`;
        } else {
            value = `${DATA}.${name}`;
        }


        context[name] = value;
    }


    // 添加一条字符串（HTML）直接输出语句
    addString(source) {

        // 压缩多余空白与注释
        if (this.options.compress) {
            source = source
                .replace(/\s+/g, ` `)
                .replace(/<!--[\w\W]*?-->/g, ``);
        }

        const code = `$out+=${JSON.stringify(source)}`;
        this.scripts.push(code);
    }


    // 添加一条逻辑表达式语句
    addExpression(source, line) {
        const options = this.options;
        const openTag = options.openTag;
        const closeTag = options.closeTag;
        const parser = options.parser;
        const compileDebug = options.compileDebug;
        const escape = options.escape;
        const escapeSymbol = options.escapeSymbol;
        const rawSymbol = options.rawSymbol;
        let code = source.replace(openTag, ``).replace(closeTag, ``);

        // v3 compat
        code = code.replace(/^=[=#]/, rawSymbol).replace(/^=/, escapeSymbol);

        const tokens = jsTokens.parser(code);


        // 将数据做为模板渲染函数的作用域
        jsTokens.namespaces(tokens).forEach(name => this.addContext(name));


        // 外部语法转换函数
        if (parser) {
            code = parser(code, options, tokens);
        }


        // 处理输出语句
        const firstToken = tokens[0];
        const isRaw = firstToken && firstToken.value === rawSymbol;
        const isEscape = firstToken && firstToken.value === escapeSymbol;
        const isOutput = isRaw || isEscape;

        if (isOutput) {
            tokens.shift();
            code = jsTokens.toString(tokens);
            if (escape === false || isRaw) {
                code = `$out+=${code}`;
            } else {
                code = `$out+=$escape(${code})`;
                this.addContext(`$escape`);
            }
        }


        if (compileDebug) {
            this.scripts.push(`$line=${line}`);
        }

        this.scripts.push(code);
    }


    // 构建渲染函数
    build() {

        const options = this.options;
        const context = this.context;
        const source = options.source;
        const filename = options.filename;
        const imports = options.imports;


        const contextCode = `var ` + Object.keys(context).map(name => `${name}=${context[name]}`).join(`,`);
        const scriptsCode = this.scripts.join(`;\n`);
        const main = [`"use strict"`, contextCode, scriptsCode, `return $out`].join(`;\n`);


        let code = `return function (${DATA}) {${main}}`;


        if (options.compileDebug) {
            const throwCode = JSON.stringify({
                path: filename,
                name: `Render Error`,
                message: `e.message`,
                line: `$line`,
                source: `${JSON.stringify(source)}.split(/\\n/)[$line-1].replace(/^\\s+/,")`
            });

            code = `try{${code}}catch(e){throw ${throwCode}}`;
        }


        try {
            return new Function(IMPORTS, code)(imports);
        } catch (e) {
            // 编译失败，语法错误
            throw {
                path: filename,
                name: `Syntax Error`,
                message: e.message,
                line: 0, // 动态构建的函数无法捕获错误
                source: scriptsCode,
                temp: code
            };
        }

    }
};



module.exports = Compiler;