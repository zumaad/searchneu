/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */


import _ from 'lodash';
import cache from '../../cache';
import macros from '../../../macros';
import Request from '../../request';
import SearchResultsParser from './searchResultsParser';
import Keys from '../../../../common/Keys';
import util from './util';

const request = new Request('bannerv9Parser');

class Bannerv9Parser {
  async main(termsUrl) {
    const bannerTerms = await request.get({
      url: termsUrl,
      json: true,
    });

    /*
     * notice: parsing many (like 23) terms might use more
     * memory than default allocation by node.js
     * performance: 60-90 seconds per term
     */
    const termsToKeep = bannerTerms.body;

    const terms = ['202030'];//, '201940', '201950', '201960', '202010'];

    const serializedTerms = this.serializeTermsList(termsToKeep).filter((t) => { return terms.includes(t.termId); });

    macros.log('scraping terms', serializedTerms.map((t) => { return t.termId; }));

    let subjectsRequests = [];
    let sectionsDataPerEveryTerm = [];
    termsToKeep.forEach((term) => {
      sectionsDataPerEveryTerm.push(this.requestsSectionsForTerm(term.termId));
      subjectsRequests.push(this.requestSubject(term.termId));
    });
    subjectsRequests = await Promise.all(subjectsRequests);
    sectionsDataPerEveryTerm = await Promise.all(sectionsDataPerEveryTerm);

    let allSubjects = [];
    serializedTerms.forEach((term) => {
      const subjectResponse = subjectsRequests.shift();
      allSubjects = allSubjects.concat(this.processSubjectListResponse(subjectResponse, term));
    });

    const allSectionsEveryTerm = _.flatten(sectionsDataPerEveryTerm);
    macros.log(`scraping ${allSectionsEveryTerm.length} sections`);
    const allSections = await util.promiseMap(allSectionsEveryTerm,
      (x) => { return SearchResultsParser.mostDetails(x); },
      { concurrency: 300 });
    macros.log('all sections scraped');

    // TOD: Run any other parsers you want to run
    // All of the other existing parsers run 0 or 1 other parsers, but you can run any number
    // just keep it managable

    // let outputFromOtherParsers = await someOtherParser.main(urlOrSomeData);

    const subjectAbbreviationTable = SearchResultsParser.createSubjectsAbbreviationTable(allSubjects);
    const uniqueClasses = await this.collapseSameCourses(allSections, subjectAbbreviationTable);
    allSections.forEach((details) => { return SearchResultsParser.stripSectionDetails(details); });

    const mergedOutput = {
      colleges: [
        {
          host: 'neu.edu',
          title: 'Northeastern University',
          url: 'neu.edu',
        },
      ],
      terms: serializedTerms,
      subjects: allSubjects,
      classes: uniqueClasses,
      sections: allSections,
    };

    // Possibly save the mergedOutput to disk so we don't have to run all this again
    if (macros.DEV && require.main !== module) {
      await cache.set(macros.DEV_DATA_DIR, this.constructor.name, termsUrl, mergedOutput);
      // Don't log anything because there would just be too much logging.
    }
    return mergedOutput;
  }

  serializeTermsList(termsFromBanner) {
    return termsFromBanner.map((term) => {
      this.renameKey(term, 'code', 'termId');
      this.renameKey(term, 'description', 'text');
      term.host = 'neu.edu';
      const subCollege = this.determineSubCollegeName(term.text);
      if (subCollege === 'undergraduate') {
        term.text = term.text.replace(/ (Semester|Quarter)/, '');
      } else {
        term.subCollegeName = subCollege;
      }
      return term;
    });
  }

  /**
   * Gets information about all the sections from the given term code.
   * @param termCode
   * @return {Promise<Array>}
   */
  async requestsSectionsForTerm(termCode) {
    // first, get the cookies
    // https://jennydaman.gitlab.io/nubanned/dark.html#studentregistrationssb-clickcontinue-post
    const clickContinue = await request.post({
      url: 'https://nubanner.neu.edu/StudentRegistrationSsb/ssb/term/search?mode=search',
      form: {
        term: termCode,
        studyPath: '',
        studyPathText: '',
        startDatepicker: '',
        endDatepicker: '',
      },
      cache: false,
    });

    if (clickContinue.body.regAllowed === false) {
      macros.error(`failed to get cookies (from clickContinue) for the term ${termCode}`, clickContinue);
    }

    const cookiejar = request.jar();
    for (const cookie of clickContinue.headers['set-cookie']) {
      cookiejar.setCookie(cookie, 'https://nubanner.neu.edu/StudentRegistrationSsb/');
    }

    // second, get the total number of sections in this semester
    let totalCount = await request.get({
      url: 'https://nubanner.neu.edu/StudentRegistrationSsb/ssb/searchResults/searchResults',
      qs: {
        txt_subject: '',
        txt_courseNumber: '',
        txt_term: termCode,
        startDatepicker: '',
        endDatepicker: '',
        pageOffset: '0',
        pageMaxSize: '10',
        sortColumn: 'subjectDescription',
        sortDirection: 'asc',
      },
      jar: cookiejar,
      json: true,
    });

    if (totalCount.body.success === false) {
      macros.error(`could not get sections from ${termCode}`, totalCount);
    }

    totalCount = totalCount.body.totalCount;
    const COURSES_PER_REQUEST = 500;

    // third, create a thread pool to make requests that fetch class data, 500 sections per request.
    // (500 is the limit)
    let sectionsPool = [];
    for (let nextCourseIndex = 0; nextCourseIndex < totalCount; nextCourseIndex += COURSES_PER_REQUEST) {
      sectionsPool.push(request.get({
        url: 'https://nubanner.neu.edu/StudentRegistrationSsb/ssb/searchResults/searchResults',
        qs: {
          txt_subject: '',
          txt_courseNumber: '',
          txt_term: termCode,
          startDatepicker: '',
          endDatepicker: '',
          pageOffset: nextCourseIndex,
          pageMaxSize: COURSES_PER_REQUEST,
          sortColumn: 'subjectDescription',
          sortDirection: 'asc',
        },
        jar: cookiejar,
        json: true,
      }));
    }

    // finally, merge all the section data into one array
    sectionsPool = await Promise.all(sectionsPool);
    let allSections = [];
    sectionsPool.forEach((chunk) => {
      if (chunk.body.success === false) {
        macros.error(`one of the searchResults requests for ${termCode} was unsuccessful`, chunk);
      }
      allSections = allSections.concat(chunk.body.data);
    });
    return allSections;
  }


  requestSubject(termId) {
    const MAX = 200;
    const URL = 'https://nubanner.neu.edu/StudentRegistrationSsb/ssb/classSearch/get_subject';
    const subjectUrl = `${URL}?searchTerm=&term=${termId}&offset=1&max=${MAX}`;
    return request.get({
      url: subjectUrl,
      json: true,
    });
  }

  processSubjectListResponse(subjectResponse, term) {
    if (subjectResponse.statusCode !== 200) {
      macros.error(`Problem with request for subjects ${subjectResponse.request.uri.href}`);
    }
    return subjectResponse.body.map((subjectData) => {
      return {
        subject: subjectData.code,
        text: subjectData.description,
        termId: term.termId,
        host: term.host,
      };
    });
  }


  /**
   * Loops over the details for all sections, creating a new array of every unique class
   * with a list of offered CRNs corresponding to each separate section.
   * @param sections large array of objects that came from SearchResultsParser.mostDetails(s)
   */
  async collapseSameCourses(sections, subjectAbbreviationTable) {
    const table = {};
    let promisedDescriptions = [];
    const promisedHashes = [];

    // first, get the description once for every unique class
    sections.forEach((details) => {
      details.hash = Keys.getClassHash(details);
      if (!table[details.hash]) {
        table[details.hash] = true;
        promisedHashes.push(details.hash);
        promisedDescriptions.push(SearchResultsParser.copySectionAsClass(details, subjectAbbreviationTable));
      }
    });

    promisedDescriptions = await Promise.all(promisedDescriptions);
    for (let i = 0; i < promisedHashes.length; i++) {
      table[promisedHashes[i]] = promisedDescriptions[i];
    }

    sections.forEach((details) => {
      table[details.hash].crns.push(details.crn);
    });

    return Object.values(table);
  }

  /**
   * mutates the object directly
   * renameKey({old: 5}, 'old', 'name') -> {name: 5}
   * @param obj
   * @param old
   * @param name
   */
  renameKey(obj, old, name) {
    obj[name] = obj[old];
    delete obj[old];
  }

  /**
   * "Spring 2019 Semester" -> "undergraduate"
   * "Spring 2019 Law Quarter" -> "LAW"
   * "Spring 2019 CPS Quarter" -> "CPS"
   *
   * @param termDesc
   * @returns {string}
   */
  determineSubCollegeName(termDesc) {
    if (termDesc.includes('CPS')) {
      return 'CPS';
    }
    if (termDesc.includes('Law')) {
      return 'LAW';
    }
    return 'undergraduate';
  }

  // Just a convient test method, if you want to
  async test() {
    const numTerms = 10;
    const url = `https://nubanner.neu.edu/StudentRegistrationSsb/ssb/classSearch/getTerms?offset=1&max=${numTerms}&searchTerm=`;
    const output = await this.main(url);
    // eslint-disable-next-line global-require
    require('fs').writeFileSync('parsersxe.json', JSON.stringify(output, null, 4));
  }
}

Bannerv9Parser.prototype.Bannerv9Parser = Bannerv9Parser;
const instance = new Bannerv9Parser();


if (require.main === module) {
  instance.test();
}

export default instance;
