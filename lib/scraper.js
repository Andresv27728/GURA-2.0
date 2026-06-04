import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import axios from 'axios';
import config from '../config.js';
import instagramDownloader from '@mrnima/instagram-downloader';
const { instagramdl } = instagramDownloader;

async function sekaikomikDl(url) {
	let res = await fetch(url)
	let $ = cheerio.load(await res.text())
	let data = $('script').map((idx, el) => $(el).html()).toArray()
	data = data.filter(v => /wp-content/i.test(v))
	data = eval(data[0].split('"images":')[1].split('}],')[0])
	return data.map(v => encodeURI(v))
}

async function facebookDl(url) {
	try {
		const { baseURL, apiKey } = config.api.yosoyyo;
		const api = `${baseURL}/facebook?url=${encodeURIComponent(url)}&apiKey=${apiKey}`;
		const res = await axios.get(api);
		const json = res.data;

		if ((json.status === 200 || json.status === true) && json.result && json.result.media) {
			return {
				sd: json.result.media.video_sd,
				hd: json.result.media.video_hd,
				title: json.result.info.title
			};
		} else {
			throw new Error('Invalid response structure from yosoyyo-api');
		}
	} catch (error) {
		console.error('Error in facebookDl:', error);
		throw error;
	}
}
//--
async function igStalk(username) {
    username = username.replace(/^@/, '')
    const html = await (await fetch(`https://dumpor.com/v/${username}`)).text()
    const $$ = cheerio.load(html)
    const name = $$('div.user__title > a > h1').text().trim()
    const Uname = $$('div.user__title > h4').text().trim()
    const description = $$('div.user__info-desc').text().trim()
    const profilePic = $$('div.user__img').attr('style')?.replace("background-image: url('", '').replace("');", '')
    const row = $$('#user-page > div.container > div > div > div:nth-child(1) > div > a')
    const postsH = row.eq(0).text().replace(/Posts/i, '').trim()
    const followersH = row.eq(2).text().replace(/Followers/i, '').trim()
    const followingH = row.eq(3).text().replace(/Following/i, '').trim()
    const list = $$('ul.list > li.list__item')
    const posts = parseInt(list.eq(0).text().replace(/Posts/i, '').trim().replace(/\s/g, ''))
    const followers = parseInt(list.eq(1).text().replace(/Followers/i, '').trim().replace(/\s/g, ''))
    const following = parseInt(list.eq(2).text().replace(/Following/i, '').trim().replace(/\s/g, ''))
    return {
        name,
        username: Uname,
        description,
        postsH,
        posts,
        followersH,
        followers,
        followingH,
        following,
        profilePic
    }
}

async function instagramDl(url) {
	try {
		const result = await instagramdl(url);
		if (result.status && result.result && result.result.length > 0) {
			const video = result.result.find(item => item.url && item.type === 'video');
			return video ? video.url : result.result[0].url;
		} else {
			throw new Error('Invalid or empty response from instagram-downloader');
		}
	} catch (error) {
		console.error('Error in instagramDl:', error);
		throw error;
	}
}

export {
	sekaikomikDl,
	igStalk,
	facebookDl,
	instagramDl
}
