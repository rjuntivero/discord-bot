import dotenv from 'dotenv';
dotenv.config();

import { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
});

client.login(process.env.DISCORD_TOKEN);

const prefix = '!';

// /linkaccount
client.on('messageCreate', async (message) => {
  if (message?.author.bot) return;
  if (message.content.startsWith(prefix)) return;

  const userId = message.author.id;
  const command = message.content.slice(prefix.length).trim();

  if (command === 'linkaccount') {
    const loginButton = new ButtonBuilder().setCustomId('login').setLabel('Login to your account').setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(loginButton);

    await message.channel.send({
      components: [row],
    });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'login') {
    const btn = new ButtonBuilder().setLabel('Open Themetar').setStyle(ButtonStyle.Link).setURL('https://youtube.com');

    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      content: 'Click the link below to continue!',
      components: [row],
    });
  }
});
