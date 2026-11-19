const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } = require('docx');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const MEETINGS_FILE = path.join(DATA_DIR, 'meetings.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(MEETINGS_FILE)) fs.writeFileSync(MEETINGS_FILE, JSON.stringify([]));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// Helper: Get local network IP addresses
function getNetworkIps() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

// Multer storage for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// API: System Info & Share URL
app.get('/api/info', (req, res) => {
  const ips = getNetworkIps();
  res.json({
    appName: 'ប្រព័ន្ធកត់ត្រាកំណត់ហេតុប្រជុំរដ្ឋបាល - ក្រសួងមហាផ្ទៃ',
    version: '1.0.0',
    port: PORT,
    localUrl: `http://localhost:${PORT}`,
    networkUrls: ips.map(ip => `http://${ip.address}:${PORT}`),
    ips: ips
  });
});

// API: Meetings CRUD
function readMeetings() {
  try {
    const data = fs.readFileSync(MEETINGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function writeMeetings(meetings) {
  fs.writeFileSync(MEETINGS_FILE, JSON.stringify(meetings, null, 2), 'utf8');
}

app.get('/api/meetings', (req, res) => {
  const meetings = readMeetings();
  res.json(meetings.map(m => ({
    id: m.id,
    title: m.title,
    date: m.date,
    duration: m.duration,
    speakerCount: m.speakers ? m.speakers.length : 0,
    transcriptCount: m.transcript ? m.transcript.length : 0,
    updatedAt: m.updatedAt || m.createdAt
  })));
});

app.get('/api/meetings/:id', (req, res) => {
  const meetings = readMeetings();
  const meeting = meetings.find(m => m.id === req.params.id);
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  res.json(meeting);
});

app.post('/api/meetings', (req, res) => {
  const meetings = readMeetings();
  const meetingData = req.body;
  
  if (!meetingData.id) {
    meetingData.id = 'mtg_' + Date.now();
    meetingData.createdAt = new Date().toISOString();
  }
  meetingData.updatedAt = new Date().toISOString();
  
  const index = meetings.findIndex(m => m.id === meetingData.id);
  if (index >= 0) {
    meetings[index] = meetingData;
  } else {
    meetings.unshift(meetingData);
  }
  
  writeMeetings(meetings);
  res.json({ success: true, meeting: meetingData });
});

app.delete('/api/meetings/:id', (req, res) => {
  let meetings = readMeetings();
  meetings = meetings.filter(m => m.id !== req.params.id);
  writeMeetings(meetings);
  res.json({ success: true });
});

// Audio Upload
app.post('/api/upload-audio', upload.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No audio file uploaded' });
  res.json({
    success: true,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`
  });
});

// Export to Microsoft Word (.docx) with Cambodian Administrative Letterhead & Styling
app.post('/api/export-docx', async (req, res) => {
  try {
    const {
      ministry = 'ក្រសួងមហាផ្ទៃ',
      department = 'អគ្គនាយកដ្ឋានរដ្ឋបាល',
      title = 'កំណត់ហេតុនៃកិច្ចប្រជុំ',
      date = '',
      time = '',
      location = 'សាលប្រជុំក្រសួងមហាផ្ទៃ',
      chairperson = 'ឯកឧត្តមប្រធានអង្គប្រជុំ',
      attendees = '',
      recorder = 'មន្ត្រីកត់ត្រា',
      agenda = '',
      content = '',
      decisions = '',
      actionItems = []
    } = req.body;

    const KHMER_FONT_BODY = 'Khmer OS Siemreap';
    const KHMER_FONT_HEAD = 'Khmer OS Muol Light';

    const children = [];

    // Header: Kingdom of Cambodia & Ministry
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'ព្រះរាជាណាចក្រកម្ពុជា', font: KHMER_FONT_HEAD, size: 28, bold: true }),
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: 'ជាតិ សាសនា ព្រះមហាក្សត្រ', font: KHMER_FONT_HEAD, size: 24, bold: true }),
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: ministry, font: KHMER_FONT_HEAD, size: 24, bold: true }),
        ],
        spacing: { after: 50 }
      }),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [
          new TextRun({ text: department, font: KHMER_FONT_BODY, size: 22 }),
        ],
        spacing: { after: 300 }
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: title, font: KHMER_FONT_HEAD, size: 30, bold: true, underline: {} }),
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
      const agendaLines = agenda.split('\n').filter(l => l.trim());
      for (const line of agendaLines) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: line.trim(), font: KHMER_FONT_BODY })
            ],
            bullet: { level: 0 }
          })
        );
      }
    }

    // Section 3: Meeting Proceedings & Discussion
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '៣. ដំណើរការ និងខ្លឹមសារពិភាក្សា', font: KHMER_FONT_HEAD, size: 24, bold: true })
        ],
        spacing: { before: 200, after: 100 }
      })
    );
    if (content) {
      const contentLines = content.split('\n');
      for (const line of contentLines) {
        if (line.trim()) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: line.trim(), font: KHMER_FONT_BODY })
              ],
              spacing: { after: 80 }
            })
          );
        }
      }
    }

    // Section 4: Decisions Made
    if (decisions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '៤. ការសម្រេច និងទិសដៅដឹកនាំ', font: KHMER_FONT_HEAD, size: 24, bold: true })
          ],
          spacing: { before: 200, after: 100 }
        })
      );
      const decLines = decisions.split('\n');
      for (const line of decLines) {
        if (line.trim()) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: line.trim(), font: KHMER_FONT_BODY })
              ],
              spacing: { after: 80 }
            })
          );
        }
      }
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
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `${idx + 1}`, font: KHMER_FONT_BODY })], alignment: AlignmentType.CENTER })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: item.task || '', font: KHMER_FONT_BODY })] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: item.assignee || '', font: KHMER_FONT_BODY })] })]
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: item.dueDate || '', font: KHMER_FONT_BODY })], alignment: AlignmentType.CENTER })]
              })
            ]
          })
        );
      });

      children.push(
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        })
      );
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
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE }
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'បានឃើញ និងឯកភាព', font: KHMER_FONT_HEAD, bold: true })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'ប្រធានអង្គប្រជុំ', font: KHMER_FONT_HEAD, bold: true })]
                  }),
                  new Paragraph({ spacing: { before: 1200 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: chairperson, font: KHMER_FONT_BODY, bold: true })]
                  })
                ]
              }),
              new TableCell({
                borders: {
                  top: { style: BorderStyle.NONE },
                  bottom: { style: BorderStyle.NONE },
                  left: { style: BorderStyle.NONE },
                  right: { style: BorderStyle.NONE }
                },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: `រាជធានីភ្នំពេញ, ថ្ងៃទី..... ខែ..... ឆ្នាំ២០២...`, font: KHMER_FONT_BODY, italics: true })]
                  }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: 'អ្នកធ្វើកំណត់ហេតុ', font: KHMER_FONT_HEAD, bold: true })]
                  }),
                  new Paragraph({ spacing: { before: 1200 } }),
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: recorder, font: KHMER_FONT_BODY, bold: true })]
                  })
                ]
              })
            ]
          })
        ]
      })
    );

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } // 1 inch
          }
        },
        children
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=meeting-notes-${Date.now()}.docx`);
    res.send(buffer);
  } catch (error) {
    console.error('Error generating docx:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  const ips = getNetworkIps();
  console.log(`\n======================================================`);
  console.log(`🚀 ប្រព័ន្ធកត់ត្រាកំណត់ហេតុប្រជុំរដ្ឋបាល - ក្រសួងមហាផ្ទៃ`);
  console.log(`======================================================`);
  console.log(`🌐 ប្រើលើម៉ាស៊ីនផ្ទាល់ (Localhost): http://localhost:${PORT}`);
  ips.forEach(ip => {
    console.log(`🔗 ចែករំលែកប្រើក្នុងបណ្តាញការងារ (LAN): http://${ip.address}:${PORT}`);
  });
  console.log(`======================================================\n`);
});
