'use strict';

const parser = require('xml2js').parseString;
const _=require('lodash');
const fs = require('fs');
const HTMLReporter=require('./HTMLReporter');

let buildReports = report => {
    let reporter=new HTMLReporter(report);
    reporter.parseResults();

};

let readXmlReport = () => {
    return new Promise((resolve, reject) => {
        fs.readFile('./test-reports/junitresults.xml', 'utf8', (error, data) => {
            if (error) {
                reject(error);
            }
            resolve(data);

        });
    });
};

let parseXml = junitReport => {
    return new Promise((resolve, reject) => {
        parser(junitReport, (error, result) => {
            if (error) {
                reject(error);
            }
            resolve(result);
        });
    });
};

let constructReports = () => {
    return readXmlReport()
            .then(parseXml)
            .then(buildReports);
};

module.exports = constructReports;