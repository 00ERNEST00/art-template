const defaults = require('./compile/defaults');
const detectNode = require('detect-node');
const templatePath = require.resolve('./index');
const EXTNAME = '.art';

/**
 * 绑定模板文件后缀名，以让 NodeJS 支持 `require(templateFile)`
 * @param {function} require
 * @param {?string} extname 
 */
const bindExtname = (require, extname = defaults.extname) => {

    require.extensions[extname] = (module, flnm) => {
        const filename = flnm || module.filename;
        const imports = `var template=require(${JSON.stringify(templatePath)})`;
        module._compile(`${imports};\module.exports = template.compile({filename:${JSON.stringify(filename)}});`, filename);
    };

};


if (detectNode) {
    bindExtname(require, EXTNAME);
}


module.exports = bindExtname;