const { SlashCommandBuilder } = require('discord.js');
const { getSheetValues, batchUpdateSheetValues } = require('../../utils/googleSheets');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addsalary')
    .setDescription('Добавить зарплату пользователю или всем сразу')
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('Добавить зарплату конкретному пользователю')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('Укажите Discord-пользователя (по @упоминанию)')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Сумма, которую нужно добавить')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('all')
        .setDescription('Добавить зарплату всем пользователям')
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('Сумма, которую нужно добавить каждому')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const allowedRoleId = '1277870559572787221';

    // role = role
    if (!interaction.member.roles.cache.has(allowedRoleId)) {
      return interaction.reply({
        content: 'ti nyb dyrashka',
      });
    }

    const spreadsheetId = process.env.spreadsheet_id;
    const sheetRange = 'HiTech!A3:E';

    const subcommand = interaction.options.getSubcommand();
    const amount = interaction.options.getInteger('amount');

    try {
      const rows = await getSheetValues(spreadsheetId, sheetRange);
      if (!rows || rows.length === 0) {
        return interaction.reply('Не удалось получить данные из таблицы или она пуста.');
      }

      // Колонки таблицы: [Nickname, Role, Discord, Salary, Status]
      // Индексы: 0 - Nickname, 1 - Role, 2 - Discord, 3 - Salary, 4 - Status

      if (subcommand === 'user') {
        const target = interaction.options.getUser('target');

        // searching user by id
        let userFound = false;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const discordId = row[2];
          if (discordId === target.id) {
            userFound = true;
            const oldSalary = parseInt(row[3]) || 0;
            const newSalary = oldSalary + amount;

            // Вычисляем номер строки: первые данные с 3-й строки, поэтому i=0 соответствует строке 3
            const targetRowNumber = 3 + i;
            const updateRange = `HiTech!D${targetRowNumber}`;

            // update salary for user
            await batchUpdateSheetValues(spreadsheetId, [{
              range: updateRange,
              values: [[newSalary]],
            }]);

            return interaction.reply(
              `Добавлено **${amount}** к зарплате пользователя <@${target.id}>.\nТеперь его зарплата **${newSalary}**.`
            );
          }
        }
        if (!userFound) {
          return interaction.reply('Пользователь не найден в таблице.');
        }
      } else if (subcommand === 'all') {
        // update salary for users by packet update
        const updates = [];
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const oldSalary = parseInt(row[3]) || 0;
          const newSalary = oldSalary + amount;
          const targetRowNumber = 3 + i;
          const updateRange = `HiTech!D${targetRowNumber}`;

          updates.push({
            range: updateRange,
            values: [[newSalary]],
          });
        }

        const result = await batchUpdateSheetValues(spreadsheetId, updates);
        if (result) {
          return interaction.reply(`Зарплата **+${amount}** добавлена всем пользователям (batch update).`);
        } else {
          return interaction.reply('Произошла ошибка при пакетном обновлении таблицы.');
        }
      }
    } catch (error) {
      console.error('Ошибка при работе с Google Sheets:', error);
      return interaction.reply({
        content: 'Произошла ошибка при обновлении таблицы.',
      });
    }
  },
};
