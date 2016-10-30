const fs = require('fs');
const handlebars = require('handlebars');
const marked = require('marked');
const mkdirp = require('mkdirp');
const path = require('path');

function copy(sourcePath, destinationPath, callback) {
    console.log("Copying from", sourcePath, "to", destinationPath);
    mkdirp(path.dirname(destinationPath), (err) => {
        if (err) callback(err);
        else fs.createReadStream(sourcePath)
            .pipe(fs.createWriteStream(destinationPath))
            .on('error', (err) => callback(err))
            .on('finish', () => callback());
    });
}

function isUpToDate(sourcePath, destinationPath, callback) {
    fs.stat(sourcePath, (srcErr, srcStat) => {
        if (srcErr) callback(srcErr);
        else fs.stat(destinationPath, (dstErr, dstStat) => {
            if (dstErr && dstErr.code !== 'ENOENT') callback(dstErr);
            else if (!dstErr && Date.parse(srcStat.mtime) < Date.parse(dstStat.mtime)) callback(null, true);
            else callback(null, false);
        });
    });
}

function update(sourcePath, destinationPath, callback) {
    isUpToDate(sourcePath, destinationPath, (err, upToDate) => {
        if (err) callback(err);
        else if (upToDate) callback();
        else copy(sourcePath, destinationPath, callback); 
    });
}

const pages = require('./pages.json');

handlebars.registerHelper('render', (source) => marked(fs.readFileSync(source, {encoding: 'utf8'})));

const targetRoot = process.env.npm_package_config_target_root;
const stylesheets = [];

pages.forEach(({template, partials, context, target}) => {
    Object.keys(partials).forEach((key) => {
        handlebars.registerPartial(key, fs.readFileSync(partials[key], {encoding: 'utf8'}));
    });
    const targetPath = path.join(targetRoot, target);
    mkdirp.sync(path.dirname(targetPath));
    fs.writeFileSync(targetPath, handlebars.compile(fs.readFileSync(template, {encoding: 'utf8'}))(context));

    if (context.stylesheets) {
        context.stylesheets.forEach((stylesheet) => {
            if (stylesheets.indexOf(stylesheet) < 0) {
                stylesheets.push(stylesheet);
            }
        });
    }
});

stylesheets.forEach((stylesheet) => {
    const sourcePath = path.join('./resources/stylesheets', stylesheet);
    const destinationPath = path.join(targetRoot, 'stylesheets', stylesheet);
    update(sourcePath, destinationPath, (err) => err && console.error(err));
});

update('./resources/favicon.png', path.join(targetRoot, 'favicon.png'), (err) => err && console.error(err));
