/*
 * This file is part of Search NEU and licensed under AGPL3.
 * See the license file in the root folder for details.
 */

import _ from 'lodash';
import cheerio from 'cheerio';
import { resolve } from 'url';
import Request from '../request';
import macros from '../../macros';

const request = new Request('FindMajors');

async function findMajors(url) {
  try {
    const page = await request.get({ url:url, retryCount: 1 });
    const $ = cheerio.load(page.body);

    const programRequirements = $('div#programrequirementstextcontainer');
    if (programRequirements.length > 0) {
      return { url: url, body: page.body };
    }

    const anchors = $('.active.self ul li a').toArray();

    const promises = [];
    for (const a of anchors) {
      const link = resolve(url, $(a).attr('href'));
      promises.push(findMajors(link));
    }
    return Promise.all(promises).then(_.flatten);
  } catch (err) {
    if (err.statusCode === 404) {
      return [];
    }
    return Promise.reject(err);
  }
}

export default findMajors;
