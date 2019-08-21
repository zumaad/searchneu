/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import cheerio from 'cheerio';
import macros from '../../macros';
import parseCourseTable from './parseCourseTable';

// Given a cheerio element set, does the nth element match the given selector
//   Returns false if element does not exist
function doesNthElementMatch(n, selector, set) {
  return set.eq(n).is(set.filter(selector).first());
}

const sectionTypes = {
  IGNORED: 0, // Eventually, we want to support semester hours, GPA, etc.
  COURSELIST: 1,
  UNKNOWN: 2,
};

function guessSectionType(section) {
  const header = section.eq(0).text();
  const guesses = [];
  if (header === 'University-Wide Requirements'
  || header === 'NUpath Requirements'
  || header.includes('Program Requirement')
  || header.includes('Credit Requirement')
  || header.includes('Grade Requirement')
  || header.includes('GPA Requirement')) {
    guesses.push(sectionTypes.IGNORED);
  }
  const isCourseListSecond = doesNthElementMatch(1, 'table.sc_courselist', section);
  if (isCourseListSecond) {
    guesses.push(sectionTypes.COURSELIST);
  }

  if (guesses.length === 1) {
    return guesses[0];
  } if (guesses.length > 1) {
    macros.error(`section with header ${header} matched multiple section types`);
  }
  return sectionTypes.UNKNOWN;
}

// cheerio element set
// function parseSection(section) {
//   const type = guessSectionType(section);
//   const header = section.eq(0).text();
//   switch (type) {
//     case sectionTypes.COURSELIST:
//       return parseCourseTable(section);
//     case sectionTypes.UNKNOWN:
//       return `UNKNOWN SECTION: ${header}`;
//     default:
//       return false;
//   }
// }
const TAG_TO_TEXT = ['h2', 'h3', 'p', 'ul'];

// Parse each element in the section
function parseSection(section) {
  return section.toArray().map((e) => {
    const element = cheerio(e);
    if (TAG_TO_TEXT.includes(element.prop('tagName').toLowerCase())) {
      return element.text();
    }
    return 'unknown tag';
  });
}

// Expecting HTML body of a major page
function parseRequirements(body) {
  const bodyClean = body.replace(/\xA0/g, ' '); // Remove all nbsp
  const $ = cheerio.load(bodyClean);
  const reqContainer = $('div#programrequirementstextcontainer');

  // Split up into 'sections' starting at each h2
  const sections = reqContainer.find('h2').toArray().map((h2) => {
    return $(h2).nextUntil('h2').add(h2);
  });

  const parsed = sections.map(parseSection);
  return parsed;
}

export default parseRequirements;
