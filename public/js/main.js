// Resume Builder Application
class ResumeBuilder {
  constructor() {
    this.editMode = false;
    this.domElements = {
      toggleEditBtn: document.getElementById('toggleEditBtn'),
      resumeCanvas: document.getElementById('resumeCanvas'),
      sectionList: document.getElementById('sectionList'),
      fontSizeInput: document.getElementById('fontSize'),
      fontStyleInput: document.getElementById('fontStyle'),
      fontColorInput: document.getElementById('fontColor'),
      bgColorInput: document.getElementById('bgColor'),
      headingColorInput: document.getElementById('headingColor'),
      lineHeightInput: document.getElementById('lineHeight'),
      newSectionType: document.getElementById('newSectionType'),
      resumeInner: document.querySelector('.resume-inner'),
      settingsPanel: document.querySelector('.settings-panel')
    };

    this.modals = {
      objective: new bootstrap.Modal(document.getElementById('objectiveModal')),
      customSection: new bootstrap.Modal(document.getElementById('customSectionModal'))
    };

    this.init();
  }

  init() {
    this.checkDependencies();
    this.setupEventListeners();
    this.updateSectionList();
    this.setupEditableElements();
    this.applyHeadingColor();
    this.loadSettings();
  }

  checkDependencies() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      console.error('jsPDF is not loaded');
    }
    if (typeof html2canvas !== 'function') {
      console.error('html2canvas is not loaded');
    }
    if (typeof bootstrap === 'undefined' || !bootstrap.Modal) {
      console.error('Bootstrap JS not loaded');
    }
  }

  setupEventListeners() {
    // Edit Mode Toggle
    this.domElements.toggleEditBtn?.addEventListener('click', () => this.toggleEditMode());

    // Design Settings
    this.domElements.fontSizeInput?.addEventListener('change', () => {
      this.domElements.resumeCanvas.style.fontSize = `${this.domElements.fontSizeInput.value}px`;
      this.saveSettings();
    });

    this.domElements.fontStyleInput?.addEventListener('change', () => {
      this.domElements.resumeCanvas.style.fontFamily = this.domElements.fontStyleInput.value;
      this.saveSettings();
    });

    this.domElements.fontColorInput?.addEventListener('input', () => {
      this.domElements.resumeCanvas.style.color = this.domElements.fontColorInput.value;
      this.saveSettings();
    });
this.domElements.bgColorInput?.addEventListener('input', () => {
  const bgColor = this.domElements.bgColorInput.value;
  this.domElements.resumeCanvas.style.backgroundColor = bgColor;
  const resumeTemplate = this.domElements.resumeCanvas.querySelector('.resume-template');
  if (resumeTemplate) {
    resumeTemplate.style.backgroundColor = bgColor;
  }
  this.saveSettings();
});


    // Text Alignment
    document.querySelectorAll('[data-alignment]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-alignment]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.domElements.resumeInner.style.textAlign = btn.dataset.alignment;
        this.saveSettings();
      });
    });

    // Template Switching
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.template-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.switchTemplate(card.dataset.template);
        this.saveSettings();
      });
    });

    // Section Management
    document.getElementById('addSectionBtn')?.addEventListener('click', () => this.addSection());
    document.getElementById('addObjectiveBtn')?.addEventListener('click', () => this.modals.objective.show());
    document.getElementById('saveObjectiveBtn')?.addEventListener('click', () => this.saveObjective());
    document.getElementById('addCustomSectionBtn')?.addEventListener('click', () => this.showCustomSectionModal());
    document.getElementById('saveCustomSectionBtn')?.addEventListener('click', () => this.saveCustomSection());

    // Export Buttons
    document.getElementById('downloadPdfBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportToPDF();
    });

    document.getElementById('downloadPngBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.exportToPNG();
    });

    // Mobile Settings Toggle
    document.getElementById('toggleSettingsBtn')?.addEventListener('click', () => {
      this.domElements.settingsPanel.classList.toggle('active');
    });
  }

  toggleEditMode() {
    this.editMode = !this.editMode;
    const editableElements = document.querySelectorAll('.resume-content [contenteditable="true"]');
    const deleteButtons = document.querySelectorAll('.delete-section-btn');

    editableElements.forEach(el => {
      el.contentEditable = this.editMode;
    });

    deleteButtons.forEach(btn => {
      btn.style.display = this.editMode ? 'flex' : 'none';
    });

    this.domElements.toggleEditBtn.innerHTML = this.editMode 
      ? '<i class="fas fa-eye me-1"></i> Preview Mode' 
      : '<i class="fas fa-edit me-1"></i> Edit Content';

    this.domElements.toggleEditBtn.classList.toggle('btn-outline-light');
    this.domElements.toggleEditBtn.classList.toggle('btn-light');
  }

  switchTemplate(templateName) {
    const classList = this.domElements.resumeCanvas.classList;
    classList.remove('template-professional', 'template-modern', 'template-creative', 'template-minimal');
    classList.add(`template-${templateName}`);

    const primaryColor = getComputedStyle(this.domElements.resumeCanvas)
      .getPropertyValue('--primary-color').trim();

    document.querySelectorAll('.section-title').forEach(title => {
      title.style.color = primaryColor;
    });

    if (this.domElements.headingColorInput) {
      this.domElements.headingColorInput.value = primaryColor;
    }
  }

  addSection() {
    const sectionType = this.domElements.newSectionType.value;
    let sectionHtml = '';

    switch (sectionType) {
      case 'summary':
        sectionHtml = this.createSectionHTML('Summary', '<p contenteditable="true"></p>');
        break;
      case 'experience':
        sectionHtml = `
          <div class="section">
            <button class="delete-section-btn" title="Delete section"><i class="fas fa-times"></i></button>
            <h2 class="section-title" contenteditable="true">Work Experience</h2>
            <div class="experience-item mb-4">
              <div class="d-flex justify-content-between">
                <h5 class="job-title" contenteditable="true"></h5>
                <span class="job-period" contenteditable="true"></span>
              </div>
              <p class="company-name" contenteditable="true"></p>
              <ul class="responsibilities" style="padding-left: 20px; margin-top: 10px;">
                <li contenteditable="true"></li>
                <li contenteditable="true"></li>
              </ul>
            </div>
          </div>`;
        break;
      case 'education':
        sectionHtml = `
          <div class="section">
            <button class="delete-section-btn" title="Delete section"><i class="fas fa-times"></i></button>
            <h2 class="section-title" contenteditable="true">Education</h2>
            <div class="education-item mb-3">
              <div class="d-flex justify-content-between">
                <h5 contenteditable="true"></h5>
                <span contenteditable="true"></span>
              </div>
              <p contenteditable="true"></p>
            </div>
          </div>`;
        break;
      case 'skills':
        sectionHtml = `
          <div class="section">
            <button class="delete-section-btn" title="Delete section"><i class="fas fa-times"></i></button>
            <h2 class="section-title" contenteditable="true">Skills</h2>
            <ul style="padding-left: 20px;">
              <li contenteditable="true"></li>
              <li contenteditable="true"></li>
              <li contenteditable="true"></li>
            </ul>
          </div>`;
        break;
    }

    this.domElements.resumeInner.insertAdjacentHTML('beforeend', sectionHtml);
    this.setupEditableElements();
    this.updateSectionList();
    this.applyHeadingColor();
    this.scrollToLastSection();
  }

  createSectionHTML(title, content) {
    return `
      <div class="section">
        <button class="delete-section-btn" title="Delete section"><i class="fas fa-times"></i></button>
        <h2 class="section-title" contenteditable="true">${title}</h2>
        ${content}
      </div>`;
  }

  saveObjective() {
    const title = document.getElementById('objectiveTitle').value;
    const content = document.getElementById('objectiveContent').value;
    const sectionHtml = this.createSectionHTML(title, `<p contenteditable="true">${content}</p>`);
    this.domElements.resumeInner.insertAdjacentHTML('beforeend', sectionHtml);
    this.modals.objective.hide();
    this.postSectionAddition();
  }

  showCustomSectionModal() {
    document.getElementById('customSectionTitle').value = '';
    document.getElementById('customSectionContent').value = '';
    this.modals.customSection.show();
  }

  saveCustomSection() {
    const title = document.getElementById('customSectionTitle').value || 'Custom Section';
    const content = document.getElementById('customSectionContent').value || '';
    const sectionHtml = this.createSectionHTML(title, `<div contenteditable="true">${content}</div>`);
    this.domElements.resumeInner.insertAdjacentHTML('beforeend', sectionHtml);
    this.modals.customSection.hide();
    this.postSectionAddition();
  }

  postSectionAddition() {
    this.setupEditableElements();
    this.updateSectionList();
    this.applyHeadingColor();
    this.scrollToLastSection();
  }

  scrollToLastSection() {
    const sections = document.querySelectorAll('.section');
    if (sections.length) {
      sections[sections.length - 1].scrollIntoView({ behavior: 'smooth' });
    }
  }

  updateSectionList() {
    if (!this.domElements.sectionList) return;

    this.domElements.sectionList.innerHTML = '';
    const sections = document.querySelectorAll('.section');

    if (sections.length === 0) {
      this.domElements.sectionList.innerHTML = '<div class="text-muted p-3">No sections added yet</div>';
      return;
    }

    sections.forEach((section, index) => {
      const title = section.querySelector('.section-title')?.textContent || 'Untitled Section';
      const item = document.createElement('div');
      item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
      item.innerHTML = `
        <span>${title}</span>
        <div>
          <button class="btn btn-sm btn-outline-secondary move-up-btn" ${index === 0 ? 'disabled' : ''}>
            <i class="fas fa-arrow-up"></i>
          </button>
          <button class="btn btn-sm btn-outline-secondary move-down-btn" ${index === sections.length - 1 ? 'disabled' : ''}>
            <i class="fas fa-arrow-down"></i>
          </button>
        </div>`;

      item.querySelector('.move-up-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (index > 0) {
          section.parentNode.insertBefore(section, section.previousElementSibling);
          this.updateSectionList();
        }
      });

      item.querySelector('.move-down-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (index < sections.length - 1) {
          section.parentNode.insertBefore(section.nextElementSibling, section);
          this.updateSectionList();
        }
      });

      item.addEventListener('click', () => {
        section.scrollIntoView({ behavior: 'smooth' });
      });

      this.domElements.sectionList.appendChild(item);
    });
  }

  setupEditableElements() {
    document.querySelectorAll('.delete-section-btn').forEach(btn => {
      btn.removeEventListener('click', this.deleteSectionHandler);
      btn.addEventListener('click', this.deleteSectionHandler);
      btn.style.display = this.editMode ? 'flex' : 'none';
    });
  }

  deleteSectionHandler(e) {
    if (confirm('Are you sure you want to delete this section?')) {
      const section = e.target.closest('.section');
      if (section) {
        section.remove();
        document.dispatchEvent(new Event('sectionUpdated'));
      }
    }
  }

  applyHeadingColor() {
    const color = this.domElements.headingColorInput?.value || '#4d44db';
    document.querySelectorAll('.section-title').forEach(title => {
      title.style.color = color;
    });
  }

  saveSettings() {
    const settings = {
      fontSize: this.domElements.fontSizeInput?.value,
      fontFamily: this.domElements.fontStyleInput?.value,
      fontColor: this.domElements.fontColorInput?.value,
      bgColor: this.domElements.bgColorInput?.value,
      headingColor: this.domElements.headingColorInput?.value,
      lineHeight: this.domElements.lineHeightInput?.value,
      textAlign: document.querySelector('[data-alignment].active')?.dataset.alignment,
      template: document.querySelector('.template-card.active')?.dataset.template
    };

    localStorage.setItem('resumeSettings', JSON.stringify(settings));
  }

  loadSettings() {
    const savedSettings = localStorage.getItem('resumeSettings');
    if (!savedSettings) return;

    const settings = JSON.parse(savedSettings);

    // Apply settings to inputs
    if (settings.fontSize) this.domElements.fontSizeInput.value = settings.fontSize;
    if (settings.fontFamily) this.domElements.fontStyleInput.value = settings.fontFamily;
    if (settings.fontColor) this.domElements.fontColorInput.value = settings.fontColor;
    if (settings.bgColor) this.domElements.bgColorInput.value = settings.bgColor;
    if (settings.headingColor) this.domElements.headingColorInput.value = settings.headingColor;
    if (settings.lineHeight) this.domElements.lineHeightInput.value = settings.lineHeight;

    // Apply settings to elements
    if (this.domElements.resumeCanvas) {
      this.domElements.resumeCanvas.style.fontSize = `${settings.fontSize}px`;
      this.domElements.resumeCanvas.style.fontFamily = settings.fontFamily;
      this.domElements.resumeCanvas.style.color = settings.fontColor;
      this.domElements.resumeCanvas.style.backgroundColor = settings.bgColor;
    }

    if (this.domElements.resumeInner) {
      this.domElements.resumeInner.style.textAlign = settings.textAlign;
      this.domElements.resumeInner.style.lineHeight = settings.lineHeight;
    }

    // Activate template
    if (settings.template) {
      this.switchTemplate(settings.template);
    }

    // Activate alignment button
    document.querySelectorAll('[data-alignment]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.alignment === settings.textAlign);
    });

    // Activate template card
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.toggle('active', card.dataset.template === settings.template);
    });
  }

  async exportToPDF() {
  // Only select the template area, not the editor
  const resumeElement = this.domElements.resumeCanvas.querySelector('.resume-template');
  if (!resumeElement) return;

  await document.fonts.ready; // wait for fonts to finish loading

  // Wait for all images in the resume to load
  const images = resumeElement.querySelectorAll('img');
  await Promise.all(Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; })));

  const canvas = await html2canvas(resumeElement, {
    scale: 2,
    backgroundColor: '#ffffff', // guarantees white background
    useCORS: true,
    logging: false
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', [210, 420]);
  const imgWidth = 210;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save('resume.pdf');
}

async exportToPNG() {
  const resumeElement = this.domElements.resumeCanvas.querySelector('.resume-template');
  if (!resumeElement) return;

  await document.fonts.ready;

  const images = resumeElement.querySelectorAll('img');
  await Promise.all(Array.from(images).map(img => img.complete ? Promise.resolve() : new Promise(res => { img.onload = res; })));

  const canvas = await html2canvas(resumeElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false
  });

  const link = document.createElement('a');
  link.download = 'resume.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ResumeBuilder();
});
// Image Upload Handling
