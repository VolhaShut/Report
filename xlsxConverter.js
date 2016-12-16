'use strict';

const BaseConverter = require('./BaseConverter');
const fs = require('fs');
const xl = require('excel4node');

class XlsxConverter extends BaseConverter {

    constructor(report) {
        super(report, 'xlsx');
    }

    build() {
        this.convertedReport = fillInReport(buildDataTable(this.report));
    }

    save() {
        super.save(this.convertedReport);
        return new Promise((resolve, reject) =>
            this.convertedReport.write(this.pathToReport, error => {
                if (error) {
                    reject(error);
                }
                resolve(this.pathToReport);
            }));
    }
}

let wb = new xl.Workbook();

const BASE_COLUMNS = [
    {title: 'Spec file', width: 50},
    {title: 'Scenario', width: 70},
    {title: 'Test case', width: 50},
    {title: 'Result', width: 9},
    {title: 'Duration', width: 9}
];
const LINE_STYLE = {
    style: 'thin',
    color: '000000'
};
const BORDER = {
    top: LINE_STYLE,
    right: LINE_STYLE,
    bottom: LINE_STYLE,
    left: LINE_STYLE
};
const STYLES = {
    'passed': wb.createStyle({
        alignment: {
            vertical: 'top'
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: '32CD32'
        },
        border: BORDER
    }),
    'failed': wb.createStyle({
        alignment: {
            vertical: 'top'
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: 'CD5C5C'
        },
        border: BORDER
    }),
    'pending': wb.createStyle({
        alignment: {
            vertical: 'top'
        },
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: 'F0E68C'
        },
        border: BORDER
    }),
    'bordered': wb.createStyle({
        border: BORDER
    }),
    'comment': wb.createStyle({
        alignment: {
            wrapText: true
        },
        border: BORDER
    }),
    'title': wb.createStyle({
        fill: {
            type: 'pattern',
            patternType: 'solid',
            fgColor: 'FFFF00'
        },
        border: BORDER,
        font: {
            bold: true
        }
    })
};

let getStyle = style => {
    if (style in STYLES) {
        return STYLES[style];
    }
    return wb.createStyle();
};

let createTitle = (ws, columns) => {
    columns.forEach((column, index) => {
        ws.cell(1, index + 1).string(column.title).style(getStyle('title'));
        ws.column(index + 1).setWidth(column.width);
    });
    ws.row(1).freeze();
};

let fillInWorkSheet = (ws, lines, printReason) => {
    lines.forEach((line, index) => {
        ws.cell(index + 2, 1).string(line.specFile).style(getStyle('bordered'));
        ws.cell(index + 2, 2).string(line.describe).style(getStyle('bordered'));
        ws.cell(index + 2, 3).string(line.it).style(getStyle('bordered'));
        ws.cell(index + 2, 4).string(line.status).style(getStyle(line.status));
        ws.cell(index + 2, 5).number(+(line.duration)).style(getStyle('bordered'));
        if (printReason) {
            ws.cell(index + 2, 6).string(line.reason || '').style(getStyle('comment'));
        }
    });
};

let fillInSummary = (testSummary) => {
    let wsSummary = wb.addWorksheet('Summary');
    wsSummary.cell(1, 1).string('Passed').style(getStyle('passed'));
    wsSummary.cell(1, 2).number(testSummary.passedTests).style(getStyle('passed'));
    wsSummary.cell(2, 1).string('Failed').style(getStyle('failed'));
    wsSummary.cell(2, 2).number(testSummary.failedTests).style(getStyle('failed'));
    wsSummary.cell(3, 1).string('Pending').style(getStyle('pending'));
    wsSummary.cell(3, 2).number(testSummary.pendingTests).style(getStyle('pending'));
    wsSummary.cell(4, 1).string('Total').style(getStyle('total'));
    wsSummary.cell(4, 2).number(testSummary.total).style(getStyle('total'));
};

let createWorkSheetWithTestResults = (newWorkSheet, printReason) => {
    let ws = wb.addWorksheet(newWorkSheet.name);
    createTitle(ws, newWorkSheet.columns);
    fillInWorkSheet(ws, newWorkSheet.testResults, printReason);
};

let fillInReport = (testResults) => {
    let passedTests = testResults.filter(line => line.status === 'passed');
    let pendingTests = testResults.filter(line => line.status === 'pending');
    let failedTests = testResults.filter(line => line.status === 'failed');

    fillInSummary({
        passedTests: passedTests.length,
        failedTests: failedTests.length,
        pendingTests: pendingTests.length,
        total: testResults.length
    });
    createWorkSheetWithTestResults({
        name: 'Test status',
        columns: BASE_COLUMNS,
        testResults: testResults
    });
    createWorkSheetWithTestResults({
        name: 'Passed tests',
        columns: BASE_COLUMNS,
        testResults: passedTests
    });
    createWorkSheetWithTestResults({
        name: 'Pending tests',
        columns: BASE_COLUMNS.concat({title: 'Pending reason', width: 50}),
        testResults: pendingTests
    }, true);
    createWorkSheetWithTestResults({
        name: 'Failed tests',
        columns: BASE_COLUMNS.concat({title: 'Error message', width: 50}),
        testResults: failedTests
    }, true);

    return wb;
};

let buildDataTable = report => {
    let testResults = [];
    report.testsuites.testsuite.forEach(testSuite => {
        if (+(testSuite['$'].tests) > 0 && testSuite.testcase && testSuite.testcase.length > 0) {
            testSuite.testcase.forEach(testCase => {
                let specFile = testCase['$'].classname.substring(0, testCase['$'].classname.indexOf('.spec.js'));
                let describe = /\.spec\.js\.(.+)/.exec(testCase['$'].classname);

                let testResult = {
                    specFile: specFile ? specFile + '.spec.js' : '-',
                    describe: describe ? describe[1] : testCase['$'].classname,
                    it: testCase['$'].name,
                    duration: testCase['$'].time
                };

                if (testCase.failure) {
                    testResult.status = 'failed';
                    testResult.reason = testCase.failure.map(failure => failure['$'].message).join('\n');
                }
                else if (testCase.skipped) {
                    testResult.status = 'pending';
                    testResult.reason = testCase.skipped[0]['$'] ? testCase.skipped[0]['$'].message : '';
                }
                else {
                    testResult.status = 'passed';
                }
                testResults.push(testResult);
            });
        }
    });
    return testResults;
};

module.exports = XlsxConverter;