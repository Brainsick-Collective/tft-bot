const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');
const fetch = require('node-fetch');
const { URL } = require('url');

const prefix = config.prefix;
const ranks = config.ranks;

client.once('ready', () => {
	console.log('Ready!');
});

client.login(config.discordToken);

client.on('message', async message => {
	if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

	switch (command) {
		case 'rank':
			setNickNameByRank(message, args);
			break;
		case 'nicknames':
			setAllNicknames(message, args);
			break;
		default:
			break;
	}
});

async function getData(message, url) {
	try {
		console.log('url ' + url);
		const response = await fetch(new URL(url), {
			headers: {
				'X-Riot-Token': config.riotToken,
			},
		});
		const json = await response.json();
		console.log(JSON.stringify(json))
		return json;
	} catch (error) {
		console.log(error);
		message.reply(`There was an error processing the request! Please try again in a few minutes, or contact an admin via ${message.guild.channels.get(config.channels.help).toString()} if the issue persists!`);
	}
}

async function getSummonerData(message, args) {
	const summonerName = args.join('%20');
	console.log(summonerName);
	console.log('Getting data for ' + summonerName);
	const summonerDataURL = 'https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-name/' + summonerName;

	const summonerData = await getData(message, summonerDataURL);

	return summonerData;
}
async function setAllNicknames(message, args) {
	console.log(JSON.stringify(config.members));
	for (let player in config.members) {
		console.log(player + " : " + config.members[player]);
		const summonerData = await getSummonerData(message, config.members[player].split(" "));
		const rankDataURL = 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/' + summonerData.id;
		
		getData(message, rankDataURL) .then(rankData => {
			let tftRank = null;

			for (let key in rankData) {
				let currData = rankData[key];
				if (currData.queueType === 'RANKED_TFT') {
					tftRank = currData;
				}
			}

			if (tftRank) {
				console.log('ranked stats found');
				const rank =  tftRank.tier.charAt(0) + tftRank.tier.slice(1).toLowerCase() + ' '
					+ tftRank.rank + ' ' + tftRank.leaguePoints + ' LP in TeamFight Tactics';
				console.log(rank);
				const member = message.member;
				const newNickname = message.guild.members.get(player).displayName + " " + rank
				if (tftRank != null) {
					try {
						message.channel.send(summonerData.name + ' is currently ' + newNickname);
						message.guild.members.get(player).setNickname(newNickname)
					} catch (error) {
						console.log("error setting nickname");
						console.log(error)
					}
				}
			} else {
				console.log(`Can't find a teamfight tactics rank for that summoner name! Please try again in a few minutes`);
			}
		});
	}
	message.channel.send("all ranked tft players' names have been updated. \n everyone HAIL THE HEIRARCHY")
}
async function setNickNameByRank(message, args, summonerData = null) {
	if (!summonerData) {
		summonerData = await getSummonerData(message, args);
	}
	const rankDataURL = 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/' + summonerData.id;
	getData(message, rankDataURL).then(rankData => {
		let tftRank = null;

		for (let key in rankData) {
			let currData = rankData[key];
			if (currData.queueType === 'RANKED_TFT') {
				tftRank = currData;
			}
		}

		if (tftRank) {
			const newNickname = tftRank.tier.charAt(0) + tftRank.tier.slice(1).toLowerCase() + ' '
				+ tftRank.rank + ' ' + tftRank.leaguePoints + ' LP in TeamFight Tactics';
			const member = message.member;
			message.channel.send(summonerData.name + 'is currently ' + newNickname);
		} else {
			message.reply(`Can't find a teamfight tactics rank for that summoner name! try getting gewd`);
		}
	});

}
async function setRoleByRank(message, args, summonerData = null) {
	if (!summonerData) {
		summonerData = await getSummonerData(message, args);
	}

	console.log(summonerData.id + ' -> id');
	const rankDataURL = 'https://na1.api.riotgames.com/lol/league/v4/entries/by-summoner/' + summonerData.id;

	getData(message, rankDataURL).then(rankData => {
		let soloQueueRankData = null;

		for (let key in rankData) {
			let currData = rankData[key];
			if (currData.queueType === 'RANKED_SOLO_5x5') {
				soloQueueRankData = currData;
			}
		}

		if (soloQueueRankData) {
			const formattedTier = soloQueueRankData.tier.charAt(0) + soloQueueRankData.tier.slice(1).toLowerCase();

			const role = message.guild.roles.find(r => r.name === formattedTier);
			const member = message.member;

			if (message.member.roles.has(role.id)) {
				message.reply('You are currently ' + formattedTier + ' ' + soloQueueRankData.rank + '. You already have that role!');
			} else {
				for (let key in ranks) {
					let rank = ranks[key];
					let currRank = message.guild.roles.find(r => r.name === rank);
					if (message.member.roles.has(currRank.id)) {
						member.removeRole(currRank).catch(console.error);
					}
				}

				member.addRole(role).catch(console.error);
				message.reply('You are currently ' + formattedTier + ' ' + soloQueueRankData.rank + '. Assigning role!');
			}
		} else {
			message.reply(`Can't find a Solo Queue rank for that summoner name! Please try again in a few minutes if the issue persists!`);
		}
	});
}