/**
 * Document Export & Sharing Manager
 * Supports Client-side standalone Word (.docx) generation with window.docx, PDF print, and JSON
 */

class DocumentExporter {
  static async exportToDocx(meetingData) {
    // If window.docx is loaded in browser, generate client-side with 0 backend!
    if (window.docx) {
      return this.exportClientSideDocx(meetingData);
    }

    // Fallback to server API if available
    try {
      const response = await fetch('/api/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingData)
      });

      if (!response.ok) throw new Error('Backend export unavailable');

      const blob = await response.blob();
      this.triggerDownload(blob, meetingData.title);
      return true;
    } catch (err) {
      console.warn('Backend export failed, attempting client-side fallback...', err);
      alert('មិនអាចទាញយកឯកសារ Word បានទេ។ សូមពិនិត្យមើលបណ្ណាល័យ docx ក្នុង Browser!');
      return false;
    }
  }

  static async exportClientSideDocx(meetingData) {
    try {
      const {
        Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, AlignmentType, BorderStyle
      } = window.docx;

      const {
        ministry = 'ក្រសួងមហាផ្ទៃ',
        department = 'អគ្គនាយកដ្ឋានរដ្ឋបាល',
        title = 'កំណត់ហេតុនៃកិច្ចប្រជុំ',
        date = '',
        time = '',
        location = 'សាលប្រជុំក្រសួងមហាផ្ទៃ',
        chairperson = 'ឯកឧត្តមប្រធានអង្គប្រជុំ',
        attendees = '',
        recorder = 'មន្ត្រីកត់ត្រាកំណត់ហេតុ',
        agenda = '',
        proceedings = '',
        decisions = '',
        actionItems = []
      } = meetingData;

      const KHMER_FONT_BODY = 'Khmer OS Siemreap';
      const KHMER_FONT_HEAD = 'Khmer OS Muol Light';
      const children = [];

      // Kingdom Motto & Ministry
      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'ព្រះរាជាណាចក្រកម្ពុជា', font: KHMER_FONT_HEAD, size: 28, bold: true })
          ],
          spacing: { after: 100 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'ជាតិ សាសនា ព្រះមហាក្សត្រ', font: KHMER_FONT_HEAD, size: 24, bold: true })
          ],
          spacing: { after: 200 }
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: ministry, font: KHMER_FONT_HEAD, size: 24, bold: true })
          ],
          spacing: { after: 50 }
        }),
        new Paragraph({
          alignment: AlignmentType.LEFT,
          children: [
            new TextRun({ text: department, font: KHMER_FONT_BODY, size: 22 })
          ],
          spacing: { after: 300 }
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: title, font: KHMER_FONT_HEAD, size: 30, bold: true, underline: {} })
          ],
          spacing: { before: 200, after: 300 }
        })
      );

      // Section 1: General Info
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '១. ព័ត៌មានទូទៅនៃអង្គប្រជុំ', font: KHMER_FONT_HEAD, size: 24, bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• កាលបរិច្ឆេទ និងពេលវេលា៖ ', font: KHMER_FONT_BODY, bold: true }),
            new TextRun({ text: `${date} ${time ? 'វេលាម៉ោង ' + time : ''}`, font: KHMER_FONT_BODY })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• ទីកន្លែង៖ ', font: KHMER_FONT_BODY, bold: true }),
            new TextRun({ text: location, font: KHMER_FONT_BODY })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• អធិបតីភាព៖ ', font: KHMER_FONT_BODY, bold: true }),
            new TextRun({ text: chairperson, font: KHMER_FONT_BODY })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• សមាសភាពចូលរួម៖ ', font: KHMER_FONT_BODY, bold: true }),
            new TextRun({ text: attendees || 'មន្ត្រីរាជការ និងថ្នាក់ដឹកនាំពាក់ព័ន្ធ', font: KHMER_FONT_BODY })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '• អ្នកកត់ត្រា៖ ', font: KHMER_FONT_BODY, bold: true }),
            new TextRun({ text: recorder, font: KHMER_FONT_BODY })
          ],
          spacing: { after: 200 }
        })
      );

      // Section 2: Agenda
      if (agenda) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '២. របៀបវារៈនៃអង្គប្រជុំ', font: KHMER_FONT_HEAD, size: 24, bold: true })
            ],
            spacing: { before: 200, after: 100 }
          })
        );
        agenda.split('\n').filter(l => l.trim()).forEach(line => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), font: KHMER_FONT_BODY })],
            bullet: { level: 0 }
          }));
        });
      }

      // Section 3: Proceedings
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '៣. ដំណើរការ និងខ្លឹមសារពិភាក្សា', font: KHMER_FONT_HEAD, size: 24, bold: true })
          ],
          spacing: { before: 200, after: 100 }
        })
      );
      const procLines = (proceedings || meetingData.quickNotes || '').split('\n');
      procLines.forEach(line => {
        if (line.trim()) {
          children.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), font: KHMER_FONT_BODY })],
            spacing: { after: 80 }
          }));
        }
      });

      // Section 4: Decisions
      if (decisions) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '៤. ការសម្រេច និងទិសដៅដឹកនាំ', font: KHMER_FONT_HEAD, size: 24, bold: true })
            ],
            spacing: { before: 200, after: 100 }
          })
        );
        decisions.split('\n').filter(l => l.trim()).forEach(line => {
          children.push(new Paragraph({
            children: [new TextRun({ text: line.trim(), font: KHMER_FONT_BODY })],
            spacing: { after: 80 }
          }));
        });
      }

      // Section 5: Action Items Table
      if (actionItems && actionItems.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '៥. កិច្ចការត្រូវអនុវត្តបន្ត (Action Items)', font: KHMER_FONT_HEAD, size: 24, bold: true })
            ],
            spacing: { before: 200, after: 100 }
          })
        );

        const tableRows = [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'ល.រ', font: KHMER_FONT_HEAD, bold: true })], alignment: AlignmentType.CENTER })],
                width: { size: 800, type: WidthType.DXA }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'ការងារត្រូវអនុវត្ត', font: KHMER_FONT_HEAD, bold: true })], alignment: AlignmentType.CENTER })],
                width: { size: 4500, type: WidthType.DXA }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'អ្នកទទួលខុសត្រូវ', font: KHMER_FONT_HEAD, bold: true })], alignment: AlignmentType.CENTER })],
                width: { size: 2500, type: WidthType.DXA }
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: 'កាលបរិច្ឆេទ', font: KHMER_FONT_HEAD, bold: true })], alignment: AlignmentType.CENTER })],
                width: { size: 1800, type: WidthType.DXA }
              })
            ]
          })
        ];

        actionItems.forEach((item, idx) => {
          tableRows.push(
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, font: KHMER_FONT_BODY })], alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.task || '', font: KHMER_FONT_BODY })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.assignee || '', font: KHMER_FONT_BODY })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: item.dueDate || '', font: KHMER_FONT_BODY })], alignment: AlignmentType.CENTER })] })
              ]
            })
          );
        });

        children.push(new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      }

      // Section 6: Signatures
      children.push(
        new Paragraph({ spacing: { before: 400 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'បានឃើញ និងឯកភាព', font: KHMER_FONT_HEAD, bold: true })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ប្រធានអង្គប្រជុំ', font: KHMER_FONT_HEAD, bold: true })] }),
                    new Paragraph({ spacing: { before: 1200 } }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: chairperson, font: KHMER_FONT_BODY, bold: true })] })
                  ]
                }),
                new TableCell({
                  borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
                  children: [
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `រាជធានីភ្នំពេញ, ថ្ងៃទី..... ខែ..... ឆ្នាំ២០២...`, font: KHMER_FONT_BODY, italics: true })] }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'អ្នកធ្វើកំណត់ហេតុ', font: KHMER_FONT_HEAD, bold: true })] }),
                    new Paragraph({ spacing: { before: 1200 } }),
                    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: recorder, font: KHMER_FONT_BODY, bold: true })] })
                  ]
                })
              ]
            })
          ]
        })
      );

      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
          children
        }]
      });

      const blob = await Packer.toBlob(doc);
      this.triggerDownload(blob, meetingData.title);
      return true;
    } catch (err) {
      console.error('Client-side docx failed:', err);
      alert('មានបញ្ហាក្នុងការទាញយកឯកសារ Word: ' + err.message);
      return false;
    }
  }

  static triggerDownload(blob, title = 'meeting-notes') {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (title || 'meeting-notes').replace(/[\/\\?%*:|"<>]/g, '-');
    a.download = `${cleanTitle}-${new Date().toISOString().slice(0, 10)}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  static printToPDF() {
    window.print();
  }

  static async copyMinutesToClipboard(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return false;
    try {
      const text = el.innerText;
      await navigator.clipboard.writeText(text);
      alert('បានចម្លងកំណត់ហេតុចូលទៅក្នុង Clipboard រួចរាល់! លោកអ្នកអាចយកទៅ Paste ក្នុង Telegram ឬកម្មវិធីផ្សេងៗបាន។');
      return true;
    } catch (e) {
      alert('មិនអាចចម្លងបានទេ សូមអនុញ្ញាតសិទ្ធិ Clipboard!');
      return false;
    }
  }

  static downloadJSON(meetingData) {
    const jsonStr = JSON.stringify(meetingData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-backup-${meetingData.id || Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

window.DocumentExporter = DocumentExporter;
