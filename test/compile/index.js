const assert = require('assert');
const compile = require('../../src/compile/index');

describe('#compile/index', () => {
    const test = (code, data, result) => {
        it(code, () => {
            const render = compile(code, {
                bail: true
            });
            const html = render(data);
            assert.deepEqual(result, html);
        });
    };


    describe('output', () => {
        test('hello <%=value%>.', { value: 'aui' }, 'hello aui.');
        test('hello <%=value%>.', { value: '<aui>' }, 'hello &#60;aui&#62;.');
        test('hello <%-value%>.', { value: '<aui>' }, 'hello <aui>.');

        test(`<%\nprint('hello > world')\n%>`, {}, 'hello > world');
        test(`<%- print('hello > world') %>`, {}, 'hello > world');
        test(`<%= print('hello > world') %>`, {}, 'hello &#62; world');
    });

    describe('ejs', () => {
        test('<%# value %>', { value: 'aui' }, '');
        test('<%= value -%>', { value: 'aui' }, 'aui');
    });

    describe('errors', () => {
        it('RuntimeError', () => {
            const render = compile('<%=a.b.c%>');
            assert.deepEqual('{Template Error}', render({}));
        });

        it('CompileError', () => {
            const render = compile('<%=a b c%>');
            assert.deepEqual('{Template Error}', render({}));
        });

        it('CompileError: Template not found', () => {
            const render = compile({
                filename: '/404.html'
            });
            assert.deepEqual('{Template Error}', render({}));
        });

        it('throw error: RuntimeError', () => {
            const render = compile({
                source: '<%=a.b.c%>',
                bail: true
            });

            try {
                render({});
            } catch (e) {
                assert.deepEqual('RuntimeError', e.name);
            }
        });

        it('throw error: CompileError: Template not found', () => {
            try {
                compile({
                    filename: '/404.html',
                    bail: true
                });
            } catch (e) {
                assert.deepEqual('CompileError', e.name);
            }
        });

        it('throw error: CompileError', () => {
            try {
                const render = compile('<%=a b c%>', {
                    bail: true
                });
                render({});
            } catch (e) {
                assert.deepEqual('CompileError', e.name);
            }
        });

    });


    describe('toString', () => {
        const render = compile('<%=value%>');
        it('toString()', () => {
            assert.deepEqual('string', typeof render.toString());
            assert.deepEqual(-1, render.toString.toString().indexOf('[native code]'));
        });
    });


});