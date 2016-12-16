'use strict';
const _ = require('lodash');
const fs = require('fs');
const pug = require('pug');



class HTMLReporter {
    constructor(data) {
        this.testSuits = data;

    }

    parseResults() {
        let file = fs.createWriteStream('result.js');


        let testCount;
        let testSuit = _.flattenDeep(_.map(this.testSuits, 'testsuite'));
        testCount = testSuit.length;

        let passed = 0;
        let failed = 0;
        let skipped = 0;
        // let tests=[];
        let time = [];
        let maxTime = 0;
        let counter = 0;
        let tests = [];

        for (let i in testSuit) {

            if (maxTime < Number(testSuit[i].$.time)) {
                maxTime = Number(testSuit[i].$.time);
            }

            time.push(Number(testSuit[i].$.time));
           tests.push(testSuit[i].$);

            if (testSuit[i].$.skipped != 0) {
                skipped += parseInt(testSuit[i].$.skipped);
            }
            if (testSuit[i].$.failures != 0) {
                failed += parseInt(testSuit[i].$.failures);
            }

            if (Array.isArray(testSuit[i].testcase)) {
                let temp = testSuit[i].testcase;
               // console.log(temp);
                for (let j in temp) {
                    if (temp[j].failure===undefined) {
                        passed++;
                   } else {
                        console.log(temp[j].failure);

                    }
                     //console.log(temp[j].$);
                    //  tests.push({
                    //      name: testSuit[i].$.name,
                    //      time: testSuit[i].$.time,
                    //      errors: testSuit[i].$.errors,
                    //      tests: testSuit[i].$.tests,
                    //      skipped:testSuit[i].$.skipped,
                    //     disabled:testSuit[i].$.disabled,
                    //     failures:testSuit[i].$.failures,
                    //      testcase:temp.$,
                    // //     timeClass:temp[j].$.time
                    //    });
                     counter++;
                }
            } else {
                if ((testSuit[i].$.skipped == 0) && (testSuit[i].$.failures == 0) && (testSuit[i].$.errors == 0) && (testSuit[i].$.disabled == 0)) {
                    passed++;
                }
               // tests.push(testSuit[i].$);
            }
           // console.log(tests);
            counter++;
            //  tests.push(counter+'');
            file.write(testSuit[i].$.toString());
        }
        file.end(' ');
        //fs.writeFileSync('./test-reports/result.js', tests);
        let passedPercent = (passed / counter) * 100;
        let failedPercent = (failed / counter) * 100;
        let skippedPercent = (skipped / counter) * 100;
        // console.log(nameTest);
        (passedPercent < 1) ? passedPercent = Math.ceil(passedPercent) : passedPercent = Math.floor(passedPercent);
        (failedPercent < 1) ? failedPercent = Math.ceil(failedPercent) : failedPercent = Math.floor(failedPercent);
        (skippedPercent < 1) ? skippedPercent = Math.ceil(skippedPercent) : skippedPercent = Math.floor(skippedPercent);


        this.createStatisticReport(counter, passedPercent, failedPercent, skippedPercent, passed, failed, skipped, time, maxTime, tests);

    }

    createStatisticReport(testsCount, passedPercent, failedPercent, skippedPercent, passed, failed, skipped, time, maxTime, tests) {

        pug.renderFile('./lib/index.pug', {
            count: testsCount,
            passedTest: passedPercent,
            failedTest: failedPercent,
            skippedTest: skippedPercent,
            passed: passed,
            failed: failed,
            skipped: skipped,
            time: time,
            maxTime: maxTime

        }, function (err, body) {
            if (err) throw err;
            fs.writeFileSync('./test-reports/index.html', body);
        });

        pug.renderFile('./lib/tables.pug', {
            count: testsCount,
            passedTest: passedPercent,
            failedTest: failedPercent,
            skippedTest: skippedPercent,
            passed: passed,
            failed: failed,
            skipped: skipped,
            time: time,
            maxTime: maxTime,
            tests: tests
        }, function (err, body) {
            if (err) throw err;
            fs.writeFileSync('./test-reports/tables.html', body);
        });
    }
}
module.exports = HTMLReporter;