/**
 * Mirava emailer — Google Apps Script web app bound to a Google Sheet.
 *
 * The FastAPI backend POSTs {secret, to, subject, html, text}; this script
 * sends the email from the deploying Google account (MailApp) and logs every
 * attempt to the "Email log" sheet. Setup: see email/apps-script/README.md.
 *
 * Script property required: MIRAVA_SECRET (same value as the backend's
 * APPS_SCRIPT_SECRET). Never put the secret in this file.
 */

var SHEET_NAME = 'Email log';
var SENDER_NAME = 'Mirava';

function doPost(e) {
  var data;
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply_({ ok: false, error: 'invalid_json' });
  }

  var expected = PropertiesService.getScriptProperties().getProperty('MIRAVA_SECRET');
  if (!expected || data.secret !== expected) {
    return reply_({ ok: false, error: 'unauthorized' });
  }

  var to = String(data.to || '').trim();
  var subject = String(data.subject || '').slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !subject) {
    return reply_({ ok: false, error: 'invalid_request' });
  }

  if (MailApp.getRemainingDailyQuota() < 1) {
    log_(to, subject, 'quota_exceeded');
    return reply_({ ok: false, error: 'quota_exceeded' });
  }

  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: String(data.html || ''),
      body: String(data.text || ''),
      name: SENDER_NAME,
      noReply: false
    });
    log_(to, subject, 'sent');
    return reply_({ ok: true, remaining: MailApp.getRemainingDailyQuota() });
  } catch (err) {
    log_(to, subject, 'error: ' + err);
    return reply_({ ok: false, error: 'send_failed' });
  }
}

/** Health check: GET the web app URL in a browser. */
function doGet() {
  return reply_({ ok: true, service: 'mirava-emailer', remaining: MailApp.getRemainingDailyQuota() });
}

/** Run once from the editor to grant Gmail/Sheets permissions and create the log sheet. */
function setup() {
  sheet_();
  Logger.log('Remaining daily email quota: ' + MailApp.getRemainingDailyQuota());
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['Time', 'To', 'Subject', 'Status']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function log_(to, subject, status) {
  try {
    sheet_().appendRow([new Date(), to, subject, status]);
  } catch (err) {
    // Logging must never block sending.
  }
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
