import resolve from 'rollup-plugin-node-resolve';

export default {
    entry: 'src/test.js',
    dest: 'dist/bundle.js',
    format: 'umd',
    plugins: [
        resolve({
            jsnext: true,
            main: true,
            module: true
        })
    ],
    moduleName: 'app'
};
