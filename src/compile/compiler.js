const jsTokens = require('./js-tokens');
const tplTokens = require('./tpl-tokens');
const isKeyword = require('is-keyword-js');

const DATA = `$data`;
const IMPORTS = `$imports`;
const has = (object, key) => object.hasOwnProperty(key);
const stringify = JSON.stringify;

class Compiler {
    /**
     * 模板编译器
     * @param   {Object}    options
     */
    constructor(options) {

        const filename = options.filename;
        const root = options.root;
        const source = options.source;

        this.options = options;

        // 记录编译后生成的代码
        this.scripts = [];

        // 运行时注入的上下文
        this.context = {};

        // 内置变量
        this.internal = {
            $out: `""`,
            $line: `[0,""]`,
            print: `function(){var text=''.concat.apply('',arguments);return $out+=text}`,
            include: `function(src,data){return $out+=$imports.$include(src,data||${DATA},${stringify(filename)},${stringify(root)})}`
        };


        this.importContext(`$out`);

        if (options.compileDebug) {
            this.importContext(`$line`);
        }


        tplTokens.parser(source, options.syntax).forEach(token => {

            const type = token.type;

            if (type === `string`) {
                this.parseString(token);
            } else if (type === `expression`) {
                this.parseExpression(token);
            }
        });

    }

    // 导入上下文
    importContext(name) {

        let value = ``;
        const internal = this.internal;
        const context = this.context;
        const options = this.options;
        const imports = options.imports;


        if (has(context, name) || name === DATA || name === IMPORTS || isKeyword(name)) {
            return;
        }

        if (has(internal, name)) {
            value = internal[name];
        } else if (has(imports, name)) {
            value = `${IMPORTS}.${name}`;
        } else {
            value = `${DATA}.${name}`;
        }


        context[name] = value;
    }


    // 解析字符串（HTML）直接输出语句
    parseString(tplToken) {

        let source = tplToken.value;
        const line = tplToken.line;
        const options = this.options;
        const compress = options.compress;

        if (compress) {
            source = compress({ line, source, compiler: this });
        }

        const code = `$out+=${stringify(source)}`;
        this.scripts.push({ source, line, code });
    }


    // 解析逻辑表达式语句
    parseExpression(tplToken) {

        const source = tplToken.value;
        const line = tplToken.line;
        const options = this.options;
        const compileDebug = options.compileDebug;

        let code = tplToken.code;
        const jsToken = jsTokens.trim(jsTokens.parser(code));

        jsTokens.namespaces(jsToken).forEach(name => this.importContext(name));
        tplToken = tplToken.parser({ tplToken, jsToken, compiler: this });


        if (tplToken.output) {
            if (escape === false || tplToken.output === 'RAW') {
                code = `$out+=${tplToken.code}`;
            } else {
                code = `$out+=$escape(${tplToken.code})`;
                this.importContext(`$escape`);
            }
        } else {
            code = tplToken.code;
        }


        if (compileDebug) {
            this.scripts.push({ source, line, code: `$line=[${line},${stringify(source)}]` });
        }


        this.scripts.push({ source, line, code });
    }



    // 检查逻辑表达式语法
    checkExpression(source) {

        // 没有闭合的块级模板语句规则
        const rules = [

            // <% } %>
            // <% }else{ %>
            // <% }else if(a){ %>
            [/^\s*}.*?{?\s*$/, ''],

            // <% list.forEach(function(a,b){ %>
            [/(^.*?\(\s*function\s*\(.*?\)\s*{\s*$)/, '$1})'],

            // <% list.forEach((a,b)=>{ %>
            [/(^.*?\(\s*.*=>\s*{\s*$)/, '$1})'],

            // <% if(a){ %>
            // <% for(var i in d){ %>
            [/(^.*?\(.*?\)\s*{\s*$)/, '$1}']

        ];


        let index = 0;
        while (index < rules.length) {
            if (rules[index][0].test(source)) {
                source = source.replace(...rules[index]);
                break;
            }
            index++;
        };


        try {
            new Function(source);
            return true;
        } catch (e) {
            return false;
        }
    }




    // 构建渲染函数
    build() {

        const options = this.options;
        const context = this.context;
        const scripts = this.scripts;
        const source = options.source;
        const filename = options.filename;
        const imports = options.imports;


        const useStrictCode = `"use strict"`;
        const contextCode = `var ` + Object.keys(context).map(name => `${name}=${context[name]}`).join(`,`);
        const scriptsCode = scripts.map(script => script.code).join(`;\n`);
        const returnCode = `return $out`;

        let renderCode = [
            useStrictCode,
            contextCode,
            scriptsCode,
            returnCode
        ].join(`;\n`);


        if (options.compileDebug) {
            const throwCode = '{' + [
                `path:${stringify(filename)}`,
                `name:"RuntimeError"`,
                `message:e.message`,
                `line:$line[0]`,
                `source:$line[1]`,
                `stack:e.stack`
            ].join(`,`) + '}';
            renderCode = `try{${renderCode}}catch(e){throw ${throwCode}}`;
        }

        renderCode = `function(${DATA}){\n${renderCode}\n}`;


        try {
            return new Function(IMPORTS, `return ${renderCode}`)(imports);
        } catch (e) {

            let index = 0;
            let line = 0;
            let source2 = source;

            while (index < scripts.length) {
                if (!this.checkExpression(scripts[index].code)) {
                    source2 = scripts[index].source;
                    line = scripts[index].line;
                    break;
                }
                index++;
            };

            throw {
                path: filename,
                name: `CompileError`,
                message: e.message,
                line,
                source: source2,
                script: renderCode,
                stack: e.stack
            };
        }

    }
};



module.exports = Compiler;