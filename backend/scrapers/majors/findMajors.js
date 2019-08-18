/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import cheerio from 'cheerio';
import { resolve } from 'url';
import Request from '../request';

const request = new Request('FindMajors');

class FindMajors {
  // Basically DFS the whole nav bar until the page has the Program Requirements div
  async expandNav(url) {
    try {
      const page = await request.get({ url:url, retryCount: 1 });
      const $ = cheerio.load(page.body);

      const programRequirements = $('div#programrequirementstextcontainer');
      if (programRequirements.length > 0) {
        return { url: url, $: $ };
      }

      const anchors = $('.active.self ul li a').toArray();

      const promises = [];
      for (const a of anchors) {
        const link = resolve(url, $(a).attr('href'));
        promises.push(this.expandNav(link));
      }
      return Promise.all(promises).then(_.flatten);
    } catch (err) {
      return [];
    }
  }

  // expecting urls like: http://catalog.northeastern.edu/undergraduate/
  async main(catalogUrl) {
    const majors = await this.expandNav(catalogUrl);
    return majors;
  }
}

const instance = new FindMajors();

if (require.main === module) {
  instance.main('http://catalog.northeastern.edu/undergraduate/');
}

export default instance;
