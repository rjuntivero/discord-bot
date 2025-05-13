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
    const username = interaction.user.username;
    const avatarURL = interaction.user.displayAvatarURL({ format: 'png', size: 256 });
    const serverId = interaction.guild.id;
    const serverName = interaction.guild.name;
    const serverIcon = interaction.guild.iconURL({ format: 'png', size: 256 }) ?? '';
    console.log(serverName);
    console.log(serverIcon);

    // Generate magic token
    const token = crypto.randomBytes(32).toString('hex');
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

    // fetch members
    const guild = await interaction.guild.fetch();
    await guild.members.fetch();

    const members = guild.members.cache.map((member) => ({
      id: member.user.id,
      username: member.user.username,
      avatar: member.user.displayAvatarURL({ format: 'png', size: 128 }),
    }));

    // send data to API
    try {
      const response = await fetch('http://localhost:8080/api/magic-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discord_id: discordId,
          token,
          username,
          avatar_url: avatarURL,
          server_id: serverId,
          server_name: serverName,
          server_icon: serverIcon,
          members,
        }),
      });

      if (!response.ok) {
        console.error(`Failed to send login data: ${response.statusText}`);
      } else {
        console.log('User, server, and members synced successfully');
      }
    } catch (err) {
      console.error('Error sending login data:', err);
    }

    // send URL
    const loginURL = `http://localhost:8080/api/magic-login?discord_id=${discordId}&token=${token}`;
    const btn = new ButtonBuilder().setLabel('Open PFPMonth').setStyle(ButtonStyle.Link).setURL(loginURL);
    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      components: [row],
    });
  }
});
