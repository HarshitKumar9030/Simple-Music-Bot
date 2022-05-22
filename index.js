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

/ Music Player
const queue = new Map();

// Command Handler
client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.name, command);
}

// Bot Login
client.login(config.token);

// Bot Status
client.on("ready", () => {
	console.log("Bot is online || Yeah Boi!(Sorry if you are a girl!)");
	client.user.setPresence({
		status: "online",
		game: {
			name: "with my friends",
			type: "PLAYING"
		}
	});
});
