var compile = require('../');
var should = require('should');
var os = require('os');
var path = require('path');
var gutil = require('gulp-util');
var File = gutil.File;
var Buffer = require('buffer').Buffer;
require('mocha');

describe('gulp-compile-hogan', function() {

    var fakeFile, fakeFile2;

    before(function() {
        fakeFile = new File({
            cwd: "",
            base: "test",
            path: "test/file.js",
            contents: new Buffer("hello {{place}}")
        });

        fakeFile2 = new File({
            cwd: "",
            base: "test",
            path: "test/file2.js",
            contents: new Buffer("{{greeting}} world")
        });

    });
    describe('compile()', function() {
        it('should compile templates into one file', function(done) {
            var stream = compile("test.js");
            stream.on('data', function(newFile){
                should.exist(newFile);
                should.exist(newFile.path);
                should.exist(newFile.relative);
                should.exist(newFile.contents);

                var newFilePath = path.resolve(newFile.path);
                var expectedFilePath = path.resolve("test/test.js");
                newFilePath.should.equal(expectedFilePath);
                newFile.relative.should.equal("test.js");
                Buffer.isBuffer(newFile.contents).should.equal(true);
                done();
            });
            stream.write(fakeFile);
            stream.write(fakeFile2);
            stream.end();
        });

        it('should compile string templates to amd modules', function(done) {
            var stream = compile("test.js");
            stream.on('data', function(newFile){
                var lines = newFile.contents.toString().split(gutil.linefeed);
                lines[0].should.equal('define(function(require) {');
                lines[1].should.equal("    var hogan = require('hogan-updated');");
                lines[2].should.equal("    var templates = {};");
                lines.pop().should.equal('})');
                lines.pop().should.equal('    return templates;');
                done();
            });
            stream.write(fakeFile);
            stream.write(fakeFile2);
            stream.end();
        });

        it('should compile string templates to commonjs modules', function(done) {
            var stream = compile("test.js", {
                wrapper: 'commonjs'
            });
            stream.on('data', function(newFile){
                var lines = newFile.contents.toString().split(gutil.linefeed);
                lines[0].should.equal('module.exports = (function() {');
                lines[1].should.equal("    var hogan = require('hogan-updated');");
                lines[2].should.equal("    var templates = {};");
                lines.pop().should.equal('})();');
                lines.pop().should.equal('    return templates;');
                done();
            });
            stream.write(fakeFile);
            stream.write(fakeFile2);
            stream.end();
        });


        it('should create mustache template objects with a render method', function(done) {
            var stream = compile("test.js", {
                wrapper: false
            });
            stream.on('data', function(newFile) {
                eval(newFile.contents.toString());
                var rendered = templates.file.render({ place: 'world'});
                rendered.should.equal('hello world');
                var rendered2 = templates.file2.render({ greeting: 'hello'});
                rendered2.should.equal('hello world');
                done();
            });
            stream.write(fakeFile);
            stream.write(fakeFile2);
            stream.end();
        });
    });
});
