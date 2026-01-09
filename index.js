const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");
const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// 🔧 CONFIGURAZIONE
const LOG_CHANNEL_ID = "ID_CANAL_LOG";
const TICKET_CATEGORIES = [
  { label: "Assistenza", id: "ID_CATEGORIA_1" },
  { label: "Pagamenti", id: "ID_CATEGORIA_2" }
];

// READY
client.once("ready", () => {
  console.log("Bot Ticket avanzato online ✅");
});

// PANNELLO
client.on("messageCreate", async (message) => {
  if (message.content === "!ticketpanel" && message.member.permissions.has("Administrator")) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder("Scegli una categoria")
      .addOptions(
        TICKET_CATEGORIES.map(cat => ({
          label: cat.label,
          value: cat.id
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);
    message.channel.send({ content: "🎫 Apri un ticket", components: [row] });
  }
});

// CREA TICKET
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const categoryId = interaction.values[0];
  const user = interaction.user;
  const guild = interaction.guild;

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`,
    parent: categoryId,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ]
  });

  const closeBtn = new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("🔒 Chiudi Ticket")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(closeBtn);

  channel.send({
    content: `🎫 Ticket di <@${user.id}>`,
    components: [row]
  });

  interaction.reply({ content: "Ticket creato ✅", ephemeral: true });
});

// CHIUSURA + TRANSCRIPT
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "close_ticket") return;

  const channel = interaction.channel;
  const messages = await channel.messages.fetch({ limit: 100 });

  let transcript = `Transcript ${channel.name}\n\n`;
  messages.reverse().forEach(m => {
    transcript += `[${m.author.tag}] ${m.content}\n`;
  });

  fs.writeFileSync("transcript.txt", transcript);

  // DM UTENTE
  const userId = channel.permissionOverwrites.cache.find(p => p.type === 1)?.id;
  if (userId) {
    const user = await client.users.fetch(userId);0
    user.send({ content: "📄 Transcript del tuo ticket", files: ["transcript.txt"] }).catch(() => {});
  }

  // CANALE LOG
  const log = await client.channels.fetch(1458554596128456795);
  log.send({ content: `📁 Ticket chiuso: ${channel.name}`, files: ["transcript.txt"] });

  await interaction.reply({ content: "Ticket chiuso ✅", ephemeral: true });
  setTimeout(() => channel.delete(), 3000);
});

client.login(process.env.TOKEN);
