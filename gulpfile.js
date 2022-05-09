const { series, parallel, watch, dest, src } = require('gulp');
const clean = require('gulp-clean');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');
const minify = require('gulp-clean-css');
const ejs = require('gulp-ejs');
const rename = require('gulp-rename');
const connect = require('gulp-connect');

const { rollup } = require('rollup');
const { terser } = require('rollup-plugin-terser');
const commonjs = require('@rollup/plugin-commonjs');
const resolve = require('@rollup/plugin-node-resolve').default;
const babel = require('@rollup/plugin-babel').default;

// babel配置
const babelConfig = {
  babelHelpers: 'bundled',
  ignore: ['node_modules'],
};

// 清除 dist 目录
function distClean() {
  return src('dist', { allowEmpty: true }).pipe(clean());
}

// 编译 ejs 文件，拓展名重命名为 html
function compileEjs() {
  return src('src/pages/*.ejs')
    .pipe(ejs())
    .pipe(rename({ extname: '.html' }))
    .pipe(dest('dist'));
}

// 处理静态文件，直接移动到 dist
function publicFile() {
  return src('public/**').pipe(dest('dist'));
}

// 编译 scss 文件
function compileSass() {
  return src('src/style/index.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(minify({ compatibility: 'ie11' }))
    .pipe(dest('dist/css'));
}

// 使用 rollup 和 babel 处理 js 文件，babel配置在 .babelrc.json 中
function compileJs() {
  return rollup({
    input: './src/index.js',
    plugins: [resolve(), commonjs(), babel(babelConfig), terser()],
  }).then((bundle) => {
    return bundle.write({
      file: 'dist/js/script.js',
      format: 'iife',
      name: 'script',
      sourcemap: false, // 开启sourcemap
    });
  });
}

// 本地服务
function server(cb) {
  connect.server({
    root: 'dist',
    port: '8082', // 默认端口
    livereload: true,
  });
  cb();
}

// 监听文件更新
function srcWatch() {
  watch(['src/pages/**/*.ejs'], series(compileEjs, reload));
  watch(['public/**'], series(publicFile, reload));
  watch(['src/index.js'], series(compileJs, reload));
  watch(['src/style/**/*.scss'], series(compileSass, reload));
}

// 本地服务刷新
function reload() {
  return src('dist/*.html').pipe(connect.reload());
}

// 构建
exports.build = series(distClean, parallel(compileJs, compileEjs, compileSass, publicFile));

// 开发
exports.dev = series(distClean, parallel(compileJs, compileEjs, compileSass, publicFile), server, srcWatch);
