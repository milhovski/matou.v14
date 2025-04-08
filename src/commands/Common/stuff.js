const { ChatInputCommandInteraction, EmbedBuilder } = require("discord.js");
const DiscordBot = require("../../client/DiscordBot");
const ApplicationCommand = require("../../structure/ApplicationCommand");
const { getSheetValues } = require('../../utils/googleSheets');

const lastSheetMessage = new Map();

module.exports = new ApplicationCommand({
  command: {
    name: 'stuff',
    description: 'Stuff list',
    type: 1,
    options: []
  },
  options: {
    botDevelopers: true,
    cooldown: 5000,
  },
  /**
   * 
   * @param {DiscordBot} client 
   * @param {ChatInputCommandInteraction} interaction 
   */
  run: async (client, interaction) => {
    // del last msg
    const lastMessageId = lastSheetMessage.get(interaction.channelId);
    if (lastMessageId) {
      try {
        const oldMessage = await interaction.channel.messages.fetch(lastMessageId);
        if (oldMessage) {
          await oldMessage.delete();
        }
      } catch (error) {
        console.log('Не удалось удалить предыдущее сообщение:', error.message);
      }
    }

    // role: listName
    const roleToSheet = {
      '1358024599786356817': 'HiTech',
      '1358024715414929598': 'ParasiteTech',
    };

    let sheetName = null;

    // gathering user roles by id
    const memberRoles = interaction.member.roles.cache;
    for (const role of memberRoles.values()) {
      if (roleToSheet[role.id]) {
        sheetName = roleToSheet[role.id];
        break;
      }
    }

    if (!sheetName) {
      return interaction.reply({
        content: 'Нет доступа',
      });
    }

    const range = `${sheetName}!A3:E`;

    let rows;
    try {
      rows = await getSheetValues(process.env.spreadsheet_id, range);
    } catch (error) {
      console.error('Ошибка при получении данных:', error);
      return interaction.reply({
        content: `Ошибка при чтении листа "${sheetName}"`,
      });
    }

    if (!rows || rows.length === 0) {
      return interaction.reply({
        content: `Нет данных или лист "${sheetName}" пуст`,
      });
    }

    let nicknames = '';
    let roles = '';
    let salaries = '';
    for (const row of rows) {
      nicknames += `${row[0]}\n`;
      roles += `${row[1]}\n`;
      salaries += `${row[3]}\n`;
    }

    // embed
    const embed = new EmbedBuilder()
      .setTitle(`**${sheetName}**`)
      .setColor(16777215)
      .addFields(
        { name: 'Ник', value: nicknames || '—', inline: true },
        { name: 'Должность', value: roles || '—', inline: true },
        { name: 'Зарплата', value: salaries || '—', inline: true },
      )
      .setFooter({ text: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    // builder and try-catch del last msg
    try {
      await interaction.reply({
        embeds: [embed],
        components: [
          {
            type: 1,
            components: [{
              type: 2, // Button
              custom_id: 'example-button-id',
              label: 'Example Button',
              style: 1
            }]
          },
        ],
      });
      const message = await interaction.fetchReply();
      lastSheetMessage.set(interaction.channelId, message.id);
    } catch (error) {
      console.error('/stuff error:', error);
    }
  }
}).toJSON();