// Resume Builder Application - Fixed version
class ResumeBuilder {
  constructor() {
    this.editMode = false;
    this.domElements = {
      toggleEditBtn: document.getElementById('toggleEditBtn'),
      resumeCanvas: document.getElementById('resumeCanvas'),
      fontSizeInput: document.getElementById('fontSize'),
      fontStyleInput: document.getElementById('fontStyle'),
      fontColorInput: document.getElementById('fontColor'),
      bgColorInput: document.getElementById('bgColor'),
      headingColorInput: document.getElementById('headingColor'),
      lineHeightInput: document.getElementById('lineHeight'),
      resumeInner: document.querySelector('.resume-inner'),
      settingsPanel: document.querySelector('.settings-panel')
    };

    this.init();
  }

  init() {
    this.checkDependencies();
    this.setupEventListeners();
    this.applyHeadingColor();
    this.loadSettings();
  }

  checkDependencies() {
    if (typeof jsPDF === 'undefined') {
      console.error('jsPDF is not loaded');
    }
    if (typeof html2canvas !== 'function') {
      console.error('html2canvas is not loaded');
    }
  }

  setupEventListeners() {
    // Edit Mode Toggle
    if (this.domElements.toggleEditBtn) {
      this.domElements.toggleEditBtn.addEventListener('click', () => this.toggleEditMode());
    }

    // Design Settings
    if (this.domElements.fontSizeInput) {
      this.domElements.fontSizeInput.addEventListener('change', () => {
        this.domElements.resumeCanvas.style.fontSize = `${this.domElements.fontSizeInput.value}px`;
        this.saveSettings();
      });
    }

    if (this.domElements.fontStyleInput) {
      this.domElements.fontStyleInput.addEventListener('change', () => {
        this.domElements.resumeCanvas.style.fontFamily = this.domElements.fontStyleInput.value;
        this.saveSettings();
      });
    }

    if (this.domElements.fontColorInput) {
      this.domElements.fontColorInput.addEventListener('input', () => {
        this.domElements.resumeCanvas.style.color = this.domElements.fontColorInput.value;
        this.saveSettings();
      });
    }

    if (this.domElements.bgColorInput) {
      this.domElements.bgColorInput.addEventListener('input', () => {
        const bgColor = this.domElements.bgColorInput.value;
        this.domElements.resumeCanvas.style.backgroundColor = bgColor;
        const resumeTemplate = this.domElements.resumeCanvas.querySelector('.resume-template');
        if (resumeTemplate) {
          resumeTemplate.style.backgroundColor = bgColor;
        }
        this.saveSettings();
      });
    }

    // Heading color
    if (this.domElements.headingColorInput) {
      this.domElements.headingColorInput.addEventListener('input', () => {
        this.applyHeadingColor();
        this.saveSettings();
      });
    }

    // Export Buttons
    const pdfBtn = document.getElementById('downloadPdfBtn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportToPDF();
      });
    }

    const pngBtn = document.getElementById('downloadPngBtn');
    if (pngBtn) {
      pngBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportToPNG();
      });
    }

    // Mobile Settings Toggle
    const settingsBtn = document.getElementById('toggleSettingsBtn');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.domElements.settingsPanel.classList.toggle('active');
      });
    }
  }

  applyHeadingColor() {
    const color = this.domElements.headingColorInput ? this.domElements.headingColorInput.value : '#4d44db';
    document.querySelectorAll('.section-title').forEach(title => {
      title.style.color = color;
    });
  }

  saveSettings() {
    const settings = {
      fontSize: this.domElements.fontSizeInput ? this.domElements.fontSizeInput.value : null,
      fontFamily: this.domElements.fontStyleInput ? this.domElements.fontStyleInput.value : null,
      fontColor: this.domElements.fontColorInput ? this.domElements.fontColorInput.value : null,
      bgColor: this.domElements.bgColorInput ? this.domElements.bgColorInput.value : null,
      headingColor: this.domElements.headingColorInput ? this.domElements.headingColorInput.value : null,
      lineHeight: this.domElements.lineHeightInput ? this.domElements.lineHeightInput.value : null
    };
    localStorage.setItem('resumeSettings', JSON.stringify(settings));
  }

  loadSettings() {
    const savedSettings = localStorage.getItem('resumeSettings');
    if (!savedSettings) return;

    const settings = JSON.parse(savedSettings);

    if (settings.fontSize && this.domElements.fontSizeInput) {
      this.domElements.fontSizeInput.value = settings.fontSize;
    }
    if (settings.fontFamily && this.domElements.fontStyleInput) {
      this.domElements.fontStyleInput.value = settings.fontFamily;
    }
    if (settings.fontColor && this.domElements.fontColorInput) {
      this.domElements.fontColorInput.value = settings.fontColor;
    }
    if (settings.bgColor && this.domElements.bgColorInput) {
      this.domElements.bgColorInput.value = settings.bgColor;
    }
    if (settings.headingColor && this.domElements.headingColorInput) {
      this.domElements.headingColorInput.value = settings.headingColor;
    }
    if (settings.lineHeight && this.domElements.lineHeightInput) {
      this.domElements.lineHeightInput.value = settings.lineHeight;
    }

    if (this.domElements.resumeCanvas) {
      if (settings.fontSize) {
        this.domElements.resumeCanvas.style.fontSize = `${settings.fontSize}px`;
      }
      if (settings.fontFamily) {
        this.domElements.resumeCanvas.style.fontFamily = settings.fontFamily;
      }
      if (settings.fontColor) {
        this.domElements.resumeCanvas.style.color = settings.fontColor;
      }
      if (settings.bgColor) {
        this.domElements.resumeCanvas.style.backgroundColor = settings.bgColor;
      }
    }
    if (this.domElements.resumeInner && settings.lineHeight) {
      this.domElements.resumeInner.style.lineHeight = settings.lineHeight;
    }
    this.applyHeadingColor();
  }

  async exportToPDF() {
    try {
      const resumeElement = document.querySelector('.resume-template');
      if (!resumeElement) {
        console.error('Resume template element not found');
        return;
      }

      await document.fonts.ready;
      
      // Wait for all images to load
      const images = resumeElement.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // Continue even if some images fail to load
        });
      }));

      const canvas = await html2canvas(resumeElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: resumeElement.scrollWidth,
        windowHeight: resumeElement.scrollHeight
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Calculate PDF dimensions (A4 aspect ratio)
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pdf = new jsPDF({
        orientation: pdfHeight > pdfWidth ? 'p' : 'l',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('resume.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please check console for details.');
    }
  }

  async exportToPNG() {
    try {
      const resumeElement = document.querySelector('.resume-template');
      if (!resumeElement) {
        console.error('Resume template element not found');
        return;
      }

      await document.fonts.ready;
      
      const images = resumeElement.querySelectorAll('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(resumeElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: true,
        scrollX: 0,
        scrollY: 0,
        windowWidth: resumeElement.scrollWidth,
        windowHeight: resumeElement.scrollHeight
      });

      const link = document.createElement('a');
      link.download = 'resume.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
      alert('Error generating PNG. Please check console for details.');
    }
  }
}

// Initialize only when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ResumeBuilder();
});