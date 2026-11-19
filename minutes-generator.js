/**
 * Official Ministry of Interior Meeting Minutes Generator
 * Formats transcript & metadata into Royal Government of Cambodia administrative template
 */

class MinutesGenerator {
  static generateHTML(meeting) {
    const {
      ministry = 'ក្រសួងមហាផ្ទៃ',
      department = 'អគ្គនាយកដ្ឋានរដ្ឋបាល',
      title = 'កំណត់ហេតុនៃកិច្ចប្រជុំ',
      date = new Date().toLocaleDateString('km-KH'),
      time = '',
      location = 'សាលប្រជុំក្រសួងមហាផ្ទៃ',
      chairperson = 'ឯកឧត្តមប្រធានអង្គប្រជុំ',
      attendees = 'មន្ត្រីរាជការ និងថ្នាក់ដឹកនាំពាក់ព័ន្ធ',
      recorder = 'មន្ត្រីកត់ត្រា',
      agenda = '',
      quickNotes = '',
      transcript = [],
      decisions = '',
      actionItems = []
    } = meeting;

    // Process transcript into narrative summary
    let discussionNarrative = '';
    if (transcript && transcript.length > 0) {
      // Group sentences by speaker
      let currentSpeaker = null;
      let speakerLines = [];

      transcript.forEach(item => {
        if (item.speaker !== currentSpeaker) {
          if (currentSpeaker && speakerLines.length > 0) {
            discussionNarrative += `<p style="margin-bottom: 0.6rem;"><strong>• ${currentSpeaker}៖</strong> បានលើកឡើង និងពិភាក្សាថា <em>«${speakerLines.join(' ')}»</em></p>`;
          }
          currentSpeaker = item.speaker;
          speakerLines = [item.text];
        } else {
          speakerLines.push(item.text);
        }
      });

      if (currentSpeaker && speakerLines.length > 0) {
        discussionNarrative += `<p style="margin-bottom: 0.6rem;"><strong>• ${currentSpeaker}៖</strong> បានលើកឡើង និងពិភាក្សាថា <em>«${speakerLines.join(' ')}»</em></p>`;
      }
    } else {
      discussionNarrative = '<p style="color: #64748b; font-style: italic;">(មិនទាន់មានអត្ថបទចម្លងសម្លេងនៅក្នុងកិច្ចប្រជុំនេះនៅឡើយទេ...)</p>';
    }

    // Process agenda
    let agendaHtml = '';
    if (agenda) {
      const lines = agenda.split('\n').filter(l => l.trim());
      agendaHtml = '<ul style="margin-left: 1.5rem; margin-bottom: 1rem;">' +
        lines.map(line => `<li>${line.trim()}</li>`).join('') +
        '</ul>';
    } else {
      agendaHtml = '<p>ពិភាក្សា និងពិនិត្យវឌ្ឍនភាពការងារទូទៅប្រចាំសប្តាហ៍/ខែ។</p>';
    }

    // Process quick notes
    let notesHtml = '';
    if (quickNotes) {
      notesHtml = `<div style="background: #f8fafc; border-left: 3px solid #1e3a8a; padding: 0.5rem 0.75rem; margin-bottom: 0.75rem;">
        <strong>ចំណាំសំខាន់ៗពីមន្ត្រីកត់ត្រា៖</strong> ${quickNotes}
      </div>`;
    }

    // Process decisions
    let decisionsHtml = '';
    if (decisions) {
      const decLines = decisions.split('\n').filter(l => l.trim());
      decisionsHtml = '<ul style="margin-left: 1.5rem; margin-bottom: 1rem;">' +
        decLines.map(line => `<li>${line.trim()}</li>`).join('') +
        '</ul>';
    } else {
      decisionsHtml = `
        <ul style="margin-left: 1.5rem; margin-bottom: 1rem;">
          <li>អង្គប្រជុំបានឯកភាពលើរបាយការណ៍ និងទិសដៅការងារដែលបានលើកឡើង។</li>
          <li>ប្រគល់ភារកិច្ចជូនអង្គភាពជំនាញពាក់ព័ន្ធរៀបចំឯកសារលម្អិតបន្ត។</li>
        </ul>
      `;
    }

    // Process action items table
    let actionItemsRows = '';
    const items = actionItems && actionItems.length > 0 ? actionItems : [
      { task: 'រៀបចំរបាយការណ៍សង្ខេបដាក់ជូនថ្នាក់ដឹកនាំពិនិត្យ', assignee: recorder, dueDate: '១ សប្តាហ៍បន្ទាប់' },
      { task: 'តាមដានការអនុវត្តតាមស្មារតីនៃអង្គប្រជុំ', assignee: 'ការិយាល័យរដ្ឋបាល', dueDate: 'បន្តបន្ទាប់' }
    ];

    actionItemsRows = items.map((item, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${item.task || ''}</td>
        <td>${item.assignee || ''}</td>
        <td style="text-align: center;">${item.dueDate || ''}</td>
      </tr>
    `).join('');

    return `
      <div class="doc-header-center">
        <div class="doc-country">ព្រះរាជាណាចក្រកម្ពុជា</div>
        <div class="doc-motto">ជាតិ សាសនា ព្រះមហាក្សត្រ</div>
        <div style="font-size: 1.2rem; line-height: 1; letter-spacing: 2px;">***</div>
      </div>

      <div class="doc-ministry-left">
        <div class="doc-ministry-name">${ministry}</div>
        <div class="doc-dept-name">${department}</div>
        <div style="font-size: 0.88rem; color: #475569; margin-top: 0.2rem;">លេខ៖ .................... / ...........</div>
      </div>

      <div class="doc-main-title">${title}</div>

      <div class="doc-section-head">១. ព័ត៌មានទូទៅនៃអង្គប្រជុំ</div>
      <p><strong>• កាលបរិច្ឆេទ និងពេលវេលា៖</strong> ${date} ${time ? 'វេលាម៉ោង ' + time : ''}</p>
      <p><strong>• ទីកន្លែង៖</strong> ${location}</p>
      <p><strong>• អធិបតីភាពដឹកនាំ៖</strong> ${chairperson}</p>
      <p><strong>• សមាសភាពចូលរួម៖</strong> ${attendees}</p>
      <p><strong>• មន្ត្រីកត់ត្រាកំណត់ហេតុ៖</strong> ${recorder}</p>

      <div class="doc-section-head">២. របៀបវារៈនៃអង្គប្រជុំ</div>
      ${agendaHtml}

      <div class="doc-section-head">៣. ដំណើរការ និងខ្លឹមសារលម្អិតនៃអង្គប្រជុំ</div>
      ${notesHtml}
      ${discussionNarrative}

      <div class="doc-section-head">៤. ការសម្រេច និងទិសដៅដឹកនាំរបស់អង្គប្រជុំ</div>
      ${decisionsHtml}

      <div class="doc-section-head">៥. កិច្ចការត្រូវអនុវត្តបន្ត (Action Items)</div>
      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 8%;">ល.រ</th>
            <th style="width: 52%;">ការងារត្រូវអនុវត្ត</th>
            <th style="width: 25%;">អ្នកទទួលខុសត្រូវ</th>
            <th style="width: 15%;">កាលបរិច្ឆេទ</th>
          </tr>
        </thead>
        <tbody>
          ${actionItemsRows}
        </tbody>
      </table>

      <div class="doc-signatures">
        <div class="doc-sig-box">
          <div class="doc-sig-title">បានឃើញ និងឯកភាព<br>ប្រធានអង្គប្រជុំ</div>
          <div class="doc-sig-name">${chairperson}</div>
        </div>
        <div class="doc-sig-box">
          <div style="font-size: 0.85rem; font-style: italic; margin-bottom: 0.35rem;">រាជធានីភ្នំពេញ, ថ្ងៃទី..... ខែ..... ឆ្នាំ២០២...</div>
          <div class="doc-sig-title">អ្នកធ្វើកំណត់ហេតុ</div>
          <div class="doc-sig-name">${recorder}</div>
        </div>
      </div>
    `;
  }
}

window.MinutesGenerator = MinutesGenerator;
