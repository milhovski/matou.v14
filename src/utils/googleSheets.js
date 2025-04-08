const { google } = require('googleapis');
const keyFile = process.env.google_key_file;
const auth = new google.auth.GoogleAuth({
  keyFile: keyFile,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// function read values
async function getSheetValues(spreadsheetId, range) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.data.values || [];
  } catch (err) {
    console.error('Ошибка при чтении данных из Google Sheets:', err);
    return null;
  }
}

// function write/update values
async function updateSheetValues(spreadsheetId, range, values) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    const resource = { values };
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED', // или 'RAW'
      resource,
    });

    return res.data;
  } catch (err) {
    console.error('Ошибка при обновлении данных в Google Sheets:', err);
    return null;
  }
}

async function batchUpdateSheetValues(spreadsheetId, data) {
  try {
    const clientAuth = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: clientAuth });

    // data — это массив объектов вида:
    // { range: 'Лист!A1', values: [['Новое значение']] }
    const resource = {
      valueInputOption: 'USER_ENTERED',
      data,
    };

    const res = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource,
    });

    return res.data;
  } catch (err) {
    console.error('Ошибка при пакетном обновлении данных:', err);
    return null;
  }
}

// export, call them from dif files
module.exports = {
  getSheetValues,
  updateSheetValues,
  batchUpdateSheetValues,
};
