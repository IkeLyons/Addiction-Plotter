const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config.json');
const { error } = require('node:console');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.MessageContent] });

// When the client is ready, run this code (only once).
// The distinction between `client: Client<boolean>` and `readyClient: Client<true>` is important for TypeScript developers.
// It makes some properties non-nullable.
client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);

        console.log("interaction channelId: " + interaction.channelId);

        const channel = client.channels.cache.get(interaction.channelId);

        let messages = [];

  		// Create message pointer
  		let message = await channel.messages
    		.fetch({ limit: 1 })
    		.then(messagePage => (messagePage.size === 1 ? messagePage.at(0) : null));

  		while (message) {
    		await channel.messages
      			.fetch({ limit: 100, before: message.id })
      			.then(messagePage => {
        			messagePage.forEach(msg => messages.push(msg));

        			// Update our message pointer to be the last message on the page of messages
        			message = 0 < messagePage.size ? messagePage.at(messagePage.size - 1) : null;
      			});
  		}
		let addictionMessages = messages.filter((m) => m.author.username === "Addiction Assessor");
		
		let outputArr = [];
		for (let m of addictionMessages) {
			if(m.content[0] === '#' || m.content[0] === 'H' || m.content[0] === 'h'){ // Kinda hacky way to filter for leaderboard messages
				// Repalce userIds with usernames
				let regex = /<@!?(\d+)>/g;
				let replaceableContent = m.content;
    			let match;
    			while ((match = regex.exec(m.content)) !== null) {
        			let userId = match[1];
        			let username = (await client.users.fetch(userId)).globalName;
        			replaceableContent = replaceableContent.replace(match[0], `${username}`);
    			}
				outputArr.push([m.createdTimestamp, replaceableContent]);
			}
		};
		// outputArr.forEach(m => console.log(m));

		var file = fs.createWriteStream('outputArr.txt');
		file.on('error', function(err) {throw err});
		outputArr.forEach(function(v) { file.write(v.join(', ') + '||||\n\n\n'); });
		file.end();
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});
