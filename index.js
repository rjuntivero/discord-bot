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
    const serverName = interaction.guild.name;
    const serverIcon = interaction.guild.icon ? `https://cdn.discordapp.com/icons/${serverId}/${interaction.guild.icon}.png` : null;

    // check if server already tracked in supabase
    const { data: serverExists } = await supabase.from('servers').select('id').eq('id', serverId).maybeSingle();

    if (!serverExists) {
      const guild = await client.guilds.fetch(serverId);
      const members = await guild.members.fetch();

      const usersToInsert = [];
      const userServersToInsert = [];

      for (const [, member] of members) {
        usersToInsert.push({
          discord_id: member.user.id,
          username: member.user.username,
          avatar_url: member.user.displayAvatarURL(),
        });

        userServersToInsert.push({
          // user_id: member.user.id,
          server_id: serverId,
          discord_id: member.user.id,
        });
      }

      await supabase.from('users').upsert(usersToInsert, {
        onConflict: 'discord_id',
      });

      await supabase.from('user_servers').upsert(userServersToInsert, {
        onConflict: 'discord_id,server_id',
      });

      await supabase.from('servers').insert({ id: serverId });
    }

    const loginURL = `http://localhost:8080/api/login/discord?discord_id=${discordId}&server_id=${serverId}&server_name=${encodeURIComponent(serverName)}&server_icon=${encodeURIComponent(serverIcon ?? '')}`;

    const btn = new ButtonBuilder().setLabel('Open PFPMonth').setStyle(ButtonStyle.Link).setURL(loginURL);

    const row = new ActionRowBuilder().addComponents(btn);

    await interaction.update({
      components: [row],
    });
  }
});
