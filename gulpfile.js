'use strict';

var spawn = require("child_process").spawn,
    exitHandler = function (code) {
        // Exit handler thought: http://stackoverflow.com/a/14032965
        spawn("pkill", ["-TERM", "-P", process.pid]);
        process.exit(code);
    };

process.on("exit", exitHandler);
process.on("close", exitHandler);
process.on("SIGINT", exitHandler.bind(1));

var emitMessage = (message) => { console.log("\x1b[36m", message, "\x1b[0m"); };

// Synchronously check if ".env" exists before import
var fs = require("fs");

if (fs.existsSync(".env")) {
    require("dotenv").config();
}

// Imports
var gulp = require("gulp"),
    gulpIf = require("gulp-if");

var testing = process.argv.indexOf("test") >= 0,
    port = process.env.PORT || "8888";

// Environment Variables
if (testing) { // Execute tests without debug
    process.env["DEBUG"] = "0";
}

var debug = process.env.DEBUG == "1",
    apiURL = process.env.API_URL || "",
    socketHost = process.env.SOCKET_HOST || "";

// Tasks definitions
gulp.task("compile", function() {
    var rename = require("gulp-rename"),
        replace = require("gulp-replace"),
        sass = require("gulp-sass");

    return gulp
        .src(["**/*.{src.html,src.js,src.json,scss}", "!node_modules/**"])
        // Define path (and name if ".src")
        .pipe(rename((path) => { path.basename = path.basename.replace(".src", "") }))
        // Performs the operations for each file
        .pipe(gulpIf("*.js", replace("***apiURL***", apiURL)))
        .pipe(gulpIf("*.json", replace("***apiURL***", apiURL)))
        .pipe(gulpIf("*.js", replace("***socketHost***", socketHost)))
        .pipe(gulpIf("*.js", replace("***codeCoverage***", testing.toString())))
        .pipe(gulpIf("*.scss", sass.sync().on("error", sass.logError)))
        .pipe(gulp.dest(""));
});

// Last task before connection
gulp.task("build", ["compile"], function() {
    var useref = require("gulp-useref"),
        uglify = require("gulp-uglify"),
        cleanCss = require("gulp-clean-css"),
        htmlMin = require("gulp-htmlmin");

    return gulp
        .src(["**/*.{html,png,ico}", "!{coverage,dist,node_modules}/**"])
        .pipe(gulpIf("index.html", useref()))
        .pipe(gulpIf("*.js", uglify()))
        .pipe(gulpIf("*.css", cleanCss({removeComments: true})))
        .pipe(gulpIf("*.html", htmlMin({collapseWhitespace: true})))
        .pipe(gulp.dest("dist"));
});

var fileHandlerTask = ((debug || testing) ? "compile" : "build");

gulp.task("connect", function() {
    var express = require('express'),
        app = express(),
        im = require('istanbul-middleware');

    if (testing) {
        im.hookLoader(".");
        app.use("/coverage", im.createHandler());
        app.use(im.createClientHandler(__dirname));
    }

    app.use(express.static(`${__dirname}/${debug || testing ? "" : "dist"}`));

    app.listen(port, function () {
        emitMessage(`Server started at "http://0.0.0.0:${port}/".`);
    });
});

gulp.task("watch", function() {
    gulp.watch(
        ["**/*.{js,html,scss}", "!app/app.module.js", "!{assets,dist,node_modules,tests}/**",
            "!{protractor.conf,gulpfile}.js"],
        [fileHandlerTask],
        function() {
            connect.reload();
        }
    );
});

// Standalone mode
var standaloneTaskDependencies = [fileHandlerTask, "connect"];
if (!testing) {
    standaloneTaskDependencies.push("watch");
}

gulp.task("standalone", standaloneTaskDependencies, function() {
    var webservicePath = "tests/webservice/",
        jsonServer = spawn(
            "node_modules/.bin/json-server", [
                `${webservicePath}database.json`,
                "--routes", `${webservicePath}routes.json`,
                "--port", process.env.API_PORT
            ]
        );
    jsonServer.stderr.on("data", (data) => { process.stderr.write(data.toString()) });
});

gulp.task("test", ["standalone"], function() {
    var request = require("request"),
        updateWebdriver = spawn("node_modules/.bin/webdriver-manager", ["update"]);
    emitMessage("Forget the message ahead. The \"webdriver\" is being updated...");

    updateWebdriver.on("close", function (code) {
        if (code != 0) {
            process.exit(code);
        }
        emitMessage("To the tests...");

        var protractor = spawn("node_modules/.bin/protractor");
        protractor.stdout.on("data", (data) => { process.stdout.write(data.toString()) });
        protractor.on("close", function (code) {
            //noinspection JSCheckFunctionSignatures
            request(`http://localhost:${port}/coverage/download`)
                .pipe(fs.createWriteStream("coverage.zip"))
                .on("close", function () {
                    var zip = new (require("adm-zip"))("./coverage.zip");
                    //noinspection JSUnresolvedFunction
                    zip.extractAllTo("coverage", true);
                    process.exit(code);
                });
        });
    });
});

gulp.task("default", [fileHandlerTask, "connect", "watch"]);