const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('scrape')
		.setDescription('Scrape for messages from the Addiction Assessor to plot over time'),
	async execute(interaction) {
		await interaction.reply('Pong!');
	},
};