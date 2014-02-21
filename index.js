/**
* Compile hogan templates into a js file
*/
var through = require('through');
var os = require('os');
var path = require('path');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = gutil.File;
var hogan = require('hogan-updated');
var _ = require('lodash');

module.exports = function(fileName, options) {
    if (!fileName) {
        throw new PluginError('gulp-hogan-compile',  'Missing fileName argument for gulp-hogan-compile');
    }
    options = _.assign({
        newLine: gutil.linefeed,
        wrapper: 'amd', // amd, commonjs or false for no wrapper
        templateOptions: {},
        templateName: function(file) {
            return path.basename(file.relative, path.extname(file.relative));
        },
    }, options || {});

    options.templateOptions.asString = true;

    var buffer = [],
        firstFile = null,
        templateName,
        compiledTemplate,
        jsString;

    function bufferContents(file) {
        if (file.isNull()) {
            return; // ignore
        }
        if (file.isStream()) {
            return this.emit('error', new PluginError('gulp-hogan-compile',  'Streaming not supported'));
        }
        if (!firstFile) {
            firstFile = file;
        }
        templateName = options.templateName(file);
        compiledTemplate  = hogan.compile(file.contents.toString('utf8'), options.templateOptions);
        jsString = '    templates["' + templateName + '"] = new hogan.Template(' + compiledTemplate + ');';
        buffer.push(jsString);
    }

    function endStream(){
        if (buffer.length === 0) {
            return this.emit('end');
        }
        // Unwrapped
        buffer.unshift("    var templates = {};");
        buffer.unshift("    var hogan = require('hogan-updated');");

        // AMD wrapper
        if (options.wrapper === 'amd') {
            buffer.unshift("define(function(require) {");
            buffer.push("    return templates;");
            buffer.push("})");
        }
        // CommonJS wrapper
        else if (options.wrapper === 'commonjs') {
            buffer.unshift("module.exports = (function() {");
            buffer.push("    return templates;");
            buffer.push("})();");
        }

        this.emit('data', new File({
            cwd: firstFile.cwd,
            base: firstFile.base,
            path: path.join(firstFile.base, fileName),
            contents: new Buffer(buffer.join(options.newLine))
        }));

        this.emit('end');
    }

    return through(bufferContents, endStream);
};
