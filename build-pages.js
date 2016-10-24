const fs = require('fs');
const handlebars = require('handlebars');
const marked = require('marked');
const mkdirp = require('mkdirp');
const path = require('path');

const pages = require('./pages.json');

handlebars.registerHelper('render', (source) => marked(fs.readFileSync(source, {encoding: 'utf8'})));

const outputDir = process.env.npm_package_config_output_dir;
const stylesheets = [];

pages.forEach(({template, partials, context, target}) => {
    Object.keys(partials).forEach((key) => {
        handlebars.registerPartial(key, fs.readFileSync(partials[key], {encoding: 'utf8'}));
    });
    const outputPath = path.join(outputDir, target);
    mkdirp.sync(path.dirname(outputPath));
    fs.writeFileSync(outputPath, handlebars.compile(fs.readFileSync(template, {encoding: 'utf8'}))(context));

    if (context.stylesheets) {
        context.stylesheets.forEach((stylesheet) => {
            if (stylesheets.indexOf(stylesheet) < 0) {
                stylesheets.push(stylesheet);
            }
        });
    }
});

stylesheets.forEach((stylesheet) => {
    const inputPath = path.join('./resources/stylesheets', stylesheet);
    const outputPath = path.join(outputDir, 'stylesheets', stylesheet);
    mkdirp.sync(path.dirname(outputPath));
    fs.createReadStream(inputPath).pipe(fs.createWriteStream(outputPath));
});

fs.createReadStream('./resources/favicon.png').pipe(fs.createWriteStream(path.join(outputDir, 'favicon.png')));
