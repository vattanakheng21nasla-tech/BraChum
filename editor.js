/**
 * Rich-Text Editor Helper
 * Manages document formatting commands (Bold, Italic, Lists, Fonts, Tables)
 */

class RichEditor {
  static format(command, value = null) {
    document.execCommand(command, false, value);
  }

  static insertTable(rows = 3, cols = 3) {
    let html = '<table class="doc-table"><thead><tr>';
    for (let c = 0; c < cols; c++) {
      html += `<th>ក្បាលតារាង ${c + 1}</th>`;
    }
    html += '</tr></thead><tbody>';
    for (let r = 0; r < rows; r++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += '<td>ទិន្នន័យ</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    document.execCommand('insertHTML', false, html);
  }
}

window.RichEditor = RichEditor;
