const minify = require('html-minifier').minify;
const purifycss = require('purify-css');
const cssParser = require('css');
const request = require('sync-request');
const md5 = require('md5');
const path = require('path');
const log = require('chip')();
const fs = require('fs-extra');

module.exports = {
    minifyHtml(html) {
        return minify(html, {
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            collapseInlineTagWhitespace: true,
            decodeEntities: true,
            minifyCSS: true,
            minifyJS: true,
            minifyURLs: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeOptionalTags: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
        });
    },

    css(data) {
        const cssFile = fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8');
        return purifycss(data, cssFile, { minify: true }, (result) => {
            const cssAst = cssParser.parse(result);
            const rules = [];
            for (let j = cssAst.stylesheet.rules.length - 1; j >= 0; j -= 1) {
                const ruleType = cssAst.stylesheet.rules[j].type;
                const disallowedTypes = ['comment', 'font-face', 'keyframes'];
                if (!disallowedTypes.includes(ruleType)) {
                    rules.push(cssAst.stylesheet.rules[j]);
                }
            }
            cssAst.stylesheet.rules = rules;

            return cssParser.stringify(cssAst);
        });
    },

    image(url, contentType = null) {
        const cacheDir = 'cache';
        const hash = md5(url + contentType);
        const cache = path.join(cacheDir, hash);
        const cacheLifetime = 7 * 24 * 60 * 60 * 1000;
        const fileExists = fs.existsSync(cache);
        const cacheInvalid =
        fileExists
        ? (new Date()) - new Date(fs.statSync(cache).ctime) > cacheLifetime
        : true;
        if (!cacheInvalid) {
            return fs.readFileSync(cache);
        }
        const req = request('GET', url, { encoding: null });
        if (req.statusCode === 200) {
            const base64 = `data:${contentType || req.headers['content-type']};base64,${new Buffer(req.body).toString('base64')}`;
            fs.outputFile(cache, base64);
            return base64;
        }
        log.error(`Failed to download ${url}`);
        return '';
    },
};
