// Make a discord music bot

const Discord = require("discord.js");
const client = new Discord.Client();
const config = require("./config.json");
const fs = require("fs");
const ytdl = require("ytdl-core");
const ytpl = require("ytpl");
const opus = require("opusscript");
const ffmpeg = require("ffmpeg");
const ytsearch = require("yt-search");
const yt = require("ytdl-core");

// Music Player
const queue = new Map();

// Command Handler
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}
// Bot Status
client.on("ready", () => {
	console.log("Bot is online!");
	client.user.setPresence({
		status: "online",
		game: {
			name: "with my friends",
			type: "PLAYING"
		}
	});
});

// Bot Message
client.on("message", message => {
	if (!message.content.startsWith(config.prefix) || message.author.bot) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/);
	const commandName = args.shift().toLowerCase();

	const command =
		client.commands.get(commandName) ||
		client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.args && !args.length) {
		let reply = `You didn't provide any arguments, ${message.author}!`;

		if (command.usage) {
			reply += `\nThe proper usage would be: \`${config.prefix}${command.name} ${command.usage}\``;
		}

		return message.channel.send(reply);
	}

	try {
		command.execute(message, args);
	} catch (error) {
		console.error(error);
		message.reply("there was an error trying to execute that command!");
	}
});


// Music Player
client.on("message", async message => {
	if (!message.content.startsWith(config.prefix) || message.author.bot) return;

	const args = message.content.slice(config.prefix.length).trim().split(/ +/);
	const command = args.shift().toLowerCase();

	if (command === "play") {
		const voiceChannel = message.member.voiceChannel;
		if (!voiceChannel) return message.channel.send("You need to be in a voice channel to play music!");
		const permissions = voiceChannel.permissionsFor(message.client.user);
		if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
			return message.channel.send("I need the permissions to join and speak in your voice channel!");
		}

		const songInfo = await ytdl.getInfo(args[0]);
		const song = {
			title: songInfo.title,
			url: songInfo.video_url
		};

		if (!queue.has(message.guild.id)) {
			const queueContruct = {
				textChannel: message.channel,
				voiceChannel: voiceChannel,
				connection: null,
				songs: [],
				volume: 5,
				playing: true
			};

			queue.set(message.guild.id, queueContruct);

			queueContruct.songs.push(song);

			try {
				var connection = await voiceChannel.join();
				queueContruct.connection = connection;
				play(message.guild, queueContruct.songs[0]);
			} catch (err) {
				console.log(err);
				queue.delete(message.guild.id);
				return message.channel.send(err);
			}
		} else {
			queue.get(message.guild.id).songs.push(song);
			return message.channel.send(`${song.title} has been added to the queue!`);
		}
	} else if (command === "skip") {
		if (!message.member.voiceChannel) return message.channel.send("You have to be in a voice channel to stop the music!");
		if (!queue.has(message.guild.id)) return message.channel.send("There is no song that I could skip!");
		let serverQueue = queue.get(message.guild.id);

		serverQueue.connection.dispatcher.end();
	} else if (command === "stop") {
		if (!message.member.voiceChannel) return message.channel.send("You have to be in a voice channel to stop the music!");
		if (!queue.has(message.guild.id)) return message.channel.send("There is no song that I could stop!");
		let serverQueue = queue.get(message.guild.id);

		serverQueue.songs = [];
		serverQueue.connection.dispatcher.end();
	} else if (command === "volume") {
		if (!message.member.voiceChannel) return message.channel.send("You have to be in a voice channel to stop the music!");
		if (!queue.has(message.guild.id)) return message.channel.send("There is no song that I could stop!");
		let serverQueue = queue.get(message.guild.id);

		if (!args[1]) return message.channel.send(`The current volume is: **${serverQueue.volume}**`);
		serverQueue.volume = args[1];
		serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1] / 5);

		return message.channel.send(`I set the volume to: **${args[1]}**`);
	} else if (command === "np") {
		if (!queue.has(message.guild.id)) return message.channel.send("There is no song that I could stop!");
		let serverQueue = queue.get(message.guild.id);

		return message.channel.send(`🎶 Now playing: **${serverQueue.songs[0].title}**`);
	}
});

function play(guild, song) {
	const serverQueue = queue.get(guild.id);

	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}

	const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
		.on("end", () => {
			serverQueue.songs.shift();
			play(guild, serverQueue.songs[0]);
		})
		.on("error", error => console.error(error));
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);

	serverQueue.textChannel.send(`🎶 Start playing: **${song.title}**`);
}

client.login(config.token);
