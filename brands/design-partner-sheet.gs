// myModel Design Partner Application — Google Apps Script
// Deploy as: Web App → Execute as: Me → Who has access: Anyone
// Paste the deployment URL into pilot-access.html as FORM_ENDPOINT

const SHEET_NAME = 'Applications';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);

    // Create sheet + headers on first run
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow([
        'Submitted At',
        'Full Name',
        'Work Email',
        'Company Name',
        'Role / Title',
        'Brand Website',
        'Business Type',
        'Monthly Meta Spend',
        'Challenges',
        'Challenge Detail',
        'Source'
      ]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, 11).setFontWeight('bold');
    }

    sheet.appendRow([
      data.submitted_at      || new Date().toISOString(),
      data.full_name         || '',
      data.work_email        || '',
      data.company_name      || '',
      data.role_title        || '',
      data.website_url       || '',
      data.business_type     || '',
      data.meta_spend        || '',
      data.challenges        || '',
      data.challenge_detail  || '',
      data.source            || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
