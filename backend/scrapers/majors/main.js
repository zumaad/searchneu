import _ from 'lodash';
import cheerio from 'cheerio';
import findMajors from './findMajors';
import parseRequirements from './parseRequirements';

async function main(url) {
  const majors = await findMajors(url);
  const parsedMajors = majors.map((page) => {
    const $ = cheerio.load(page.body);
    return {
      url: page.url,
      name: $('h1.page-title').text(),
      reqs: parseRequirements(page.body),
    };
  });
  console.log(`${majors.length} majors found`);
  const weird = _.countBy(_.flatten(_.map(parsedMajors, 'reqs')));
  console.log(`${Object.keys(weird).length} unique weird req sections`);
}

if (require.main === module) {
  main('http://catalog.northeastern.edu/undergraduate/');
}

export default main;
