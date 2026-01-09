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

// 🔧 CONFIG 
const TICKET_PARENT_CHANNEL = "1442229815762620542";
const LOG_CHANNEL_ID = "1442229815762620541";

const TICKET_CATEGORIES = [
  "Assistenza",
  "Pagamenti",
  "Segnalazioni",
  "Altro"
];

// READY
client.once("ready", () => {
  console.log("Bot Ticket online ✅");
});

// PANNELLO
client.on("messageCreate", async (message) => {
  if (
    message.content === "!ticketpanel" &&
    message.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId("ticket_category")
      .setPlaceholder("Scegli una categoria")
      .addOptions(
        TICKET_CATEGORIES.map(cat => ({
          label: cat,
          value: cat
        }))
      );

    const row = new ActionRowBuilder().addComponents(menu);
    message.channel.send({ content: "🎫 Apri un ticket", components: [row] });
  }
});

// CREA TICKET
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const category = interaction.values[0];
  const user = interaction.user;
  const guild = interaction.guild;

  const channel = await guild.channels.create({
    name: `ticket-${user.username}`,
    parent: TICKET_PARENT_CHANNEL,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
    ]
  });

  const closeBtn = new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("🔒 Chiudi Ticket")
    .setStyle(ButtonStyle.Danger);

  channel.send({
    content: `🎫 **Ticket di <@${user.id}>**\n📂 Categoria: **${category}**`,
    components: [new ActionRowBuilder().addComponents(closeBtn)]
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
  const userPerm = channel.permissionOverwrites.cache.find(p => p.type === 1);
  if (userPerm) {
    try {
      const user = await client.users.fetch(userPerm.id);
      await user.send({ content: "📄 Transcript del tuo ticket", files: ["transcript.txt"] });
    } catch {
      console.log("Impossibile inviare DM all'utente.");
    }
  }

  // LOG
  try {
    const log = await client.channels.fetch(LOG_CHANNEL_ID);
    await log.send({ content: `📁 Ticket chiuso: ${channel.name}`, files: ["transcript.txt"] });
  } catch {
    console.log("Impossibile inviare log.");
  }

  await interaction.reply({ content: "Ticket chiuso ✅", ephemeral: true });
  setTimeout(() => {
    channel.delete().catch(() => console.log("Impossibile eliminare il canale."));
  }, 3000);
});

// LOGIN BOT con variabile d'ambiente sicura
client.login(process.env.DISCORD_TOKEN)
  .then(() => console.log("Bot connesso!"))
  .catch(err => console.error("Errore login:", err));
