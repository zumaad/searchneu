/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import $ from 'cheerio';
import macros from '../../macros';

function extractSingleCourse(text) {
  const rg = /([A-Z]+) (\d+)$/;
  const matches = rg.exec(text);
  if (matches) {
    return { subject: matches[1], courseId: matches[2] };
  }
  return false;
}

function extractCourseRange(text) {
  const rg = /([A-Z]+) (\d+) to ([A-Z]+) (\d+)$/;
  const matches = rg.exec(text);
  if (matches) {
    if (matches[1] !== matches[3]) {
      macros.error(`course range ${text} could not be understood`);
    }
    return { subject: matches[1], start: matches[2], end: matches[4] };
  }
  return false;
}

function parseCourseRow(tr) {
  const text = $(tr).text();
  return extractSingleCourse(text) || `couldn't parse ${text}`;
}

// course list table as cheerio element
function parseCourseTable(courseList) {
  return courseList.find('tbody .codecol').toArray().map(parseCourseRow);
}

export default parseCourseTable;
