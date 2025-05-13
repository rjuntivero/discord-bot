import { Client, GatewayIntentBits, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const supabaseURL = process.env.SUPABASE_BASE_URL;
const supabaseKEY = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseURL, supabaseKEY);

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
});

client.login(process.env.DISCORD_TOKEN);

const prefix = '!';

client.on('messageCreate', async (message) => {
  if (message?.author.bot) return;
  if (message.content.startsWith(prefix)) return;

  const userId = message.author.id;
  const command = message.content.slice(prefix.length).trim();

  if (command === 'masky') {
    const loginButton = new ButtonBuilder().setCustomId('login').setLabel("It's that time of the month!").setStyle(ButtonStyle.Primary);
    const row = new ActionRowBuilder().addComponents(loginButton);

    await message.channel.send({
      components: [row],
      ephemeral: true,
    });
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (!interaction.inGuild()) {
    await interaction.reply({ content: 'This only works inside a server.', ephemeral: true });
    return;
  }

  if (interaction.customId === 'login') {
    const discordId = interaction.user.id;
    const serverId = interaction.guild.id;
    const serverName = encodeURIComponent(interaction.guild.name);
    const serverIcon = interaction.guild.icon ? `https://cdn.discordapp.com/icons/${serverId}/${interaction.guild.icon}.png` : null;

    console.log(`[Login Attempt] User: ${discordId} | Server: ${serverId}`);

    const loginURL = `http://localhost:8080/api/login/discord?discord_id=${discordId}&server_id=${serverId}&server_name=${serverName}&server_icon=${encodeURIComponent(serverIcon)}`;

    const btn = new ButtonBuilder().setLabel('Open PFPMonth').setStyle(ButtonStyle.Link).setURL(loginURL);

    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      components: [row],
    });
  }
});
