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
    const discordId = interaction.user.id;

    // Generate magic token
    const token = crypto.randomBytes(32).toString('hex');
    // expires 10 mins
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Save token to Supabase
    const { error } = await supabase.from('magic_tokens').insert([
      {
        discord_id: discordId,
        token: token,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    if (error) {
      console.error('Failed to create magic token:', error);
      await interaction.reply({ content: 'Something went wrong. Please try again later.', ephemeral: true });
      return;
    }

    const loginURL = `https://localhost:8080/magic-login?discord_id=${discordId}&token=${token}`;

    const btn = new ButtonBuilder().setLabel('Open Themetar').setStyle(ButtonStyle.Link).setURL(loginURL);

    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      content: 'Click the link below to continue your login!',
      components: [row],
    });
  }
});
