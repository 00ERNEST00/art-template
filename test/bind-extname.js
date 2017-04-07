const assert = require('assert');
const bindExtname = require('../src/bind-extname');
const defaults = require('../src/compile/defaults');
const path = require('path');
const resetBail = defaults.bail;


describe('#bind-extname', () => {

    defaults.extname = '.html';
    bindExtname(require);
    bindExtname(require, '.tpl');

    it('require .html', () => {
        const render = require(path.join(__dirname, 'res', 'bind-extname.file.html'));
        assert.deepEqual('hello world', render({}));
    });

    it('require .tpl', () => {
        const render = require(path.join(__dirname, 'res', 'bind-extname.file.tpl'));
        assert.deepEqual('hello world', render({}));
    });

    it('CompileError: bail=false', () => {
        defaults.bail = false;
        const render = require(path.join(__dirname, 'res', 'bind-extname.compile-error.tpl'));
        assert.deepEqual('{Template Error}', render({}));
        defaults.bail = resetBail;
    });

    it('CompileError: bail=true', () => {
        defaults.bail = true;
        let runder;

        try {
            runder = require(path.join(__dirname, 'res', 'bind-extname.compile-error.2.tpl'));
        } catch (e) {
            assert.deepEqual('CompileError', e.name);
        }

        assert.deepEqual('undefined', typeof runder);
        defaults.bail = resetBail;
    });


    it('RuntimeError: bail=false', () => {
        defaults.bail = false;
        const render = require(path.join(__dirname, 'res', 'bind-extname.runtime-error.tpl'));
        assert.deepEqual('{Template Error}', render({}));
        defaults.bail = resetBail;
    });


    it('RuntimeError: bail=true', () => {
        defaults.bail = true;
        try {
            const render = require(path.join(__dirname, 'res', 'bind-extname.runtime-error.2.tpl'));
            render({});
        } catch (e) {
            assert.deepEqual('RuntimeError', e.name);
        }
        defaults.bail = resetBail;
    });

});