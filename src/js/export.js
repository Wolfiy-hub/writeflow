// export.js
// Book design & export to PDF, DOCX, TXT, MD, HTML

const Exporter = {
  format: 'pdf',
  design: {
    pageSize: 'letter',
    font: 'georgia',
    fontSize: 12,
    lineSpacing: 1.5,
    margins: 'normal',
  },
  structure: {
    titlePage: true,
    toc: true,
    chapterNumbers: true,
    pageNumbers: true,
  },
  selectedChapters: [], // IDs of chapters to include
}

// ============================================
// INITIALIZATION
// ============================================

function initExport() {
  const exportBtn = document.getElementById('btn-export')
  if (exportBtn) exportBtn.addEventListener('click', openExportModal)
  document.getElementById('btn-do-export').addEventListener('click', doExport)

  // Format selection
  document.querySelectorAll('.export-format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.export-format-btn').forEach(b => b.classList.remove('selected'))
      btn.classList.add('selected')
      Exporter.format = btn.dataset.format
      updateFormatSpecificUI()
      updatePreview()
    })
  })

  // Design settings
  document.getElementById('export-pagesize').addEventListener('change', (e) => {
    Exporter.design.pageSize = e.target.value
    updatePreview()
  })
  document.getElementById('export-font').addEventListener('change', (e) => {
    Exporter.design.font = e.target.value
    updatePreview()
  })
  document.getElementById('export-fontsize').addEventListener('input', (e) => {
    Exporter.design.fontSize = parseInt(e.target.value)
    document.getElementById('export-fontsize-value').textContent = e.target.value + 'pt'
    updatePreview()
  })
  document.getElementById('export-linespacing').addEventListener('input', (e) => {
    Exporter.design.lineSpacing = parseInt(e.target.value) / 10
    document.getElementById('export-linespacing-value').textContent = Exporter.design.lineSpacing.toFixed(1) + '×'
    updatePreview()
  })
  document.getElementById('export-margins').addEventListener('change', (e) => {
    Exporter.design.margins = e.target.value
    updatePreview()
  })

  // Structure settings
  document.getElementById('export-title-page').addEventListener('change', (e) => {
    Exporter.structure.titlePage = e.target.checked
    updatePreview()
  })
  document.getElementById('export-toc').addEventListener('change', (e) => {
    Exporter.structure.toc = e.target.checked
    updatePreview()
  })
  document.getElementById('export-chapter-numbers').addEventListener('change', (e) => {
    Exporter.structure.chapterNumbers = e.target.checked
    updatePreview()
  })
  document.getElementById('export-page-numbers').addEventListener('change', (e) => {
    Exporter.structure.pageNumbers = e.target.checked
    updatePreview()
  })

  // Chapter selection buttons
  document.getElementById('export-select-all').addEventListener('click', () => {
    Exporter.selectedChapters = AppState.currentProject.chapters.map(c => c.id)
    renderChaptersList()
    updatePreview()
  })
  document.getElementById('export-select-none').addEventListener('click', () => {
    Exporter.selectedChapters = []
    renderChaptersList()
    updatePreview()
  })
}

function updateExportButtonVisibility() {
  const btn = document.getElementById('btn-export')
  if (!btn) return
  if (AppState.currentProject) {
    btn.classList.remove('hidden')
  } else {
    btn.classList.add('hidden')
  }
}

// ============================================
// OPEN EXPORT MODAL
// ============================================

function openExportModal() {
  if (!AppState.currentProject) {
    showToast('Open a project first', 'info')
    return
  }

  if (!AppState.currentProject.chapters || AppState.currentProject.chapters.length === 0) {
    showToast('Your project has no chapters to export', 'info')
    return
  }

  // Default: select all chapters
  Exporter.selectedChapters = AppState.currentProject.chapters.map(c => c.id)

  renderChaptersList()
  updateFormatSpecificUI()
  updatePreview()
  showModal('modal-export')
}

function updateFormatSpecificUI() {
  const designSection = document.getElementById('section-design')
  // Only PDF & DOCX use design settings; TXT/MD/HTML are simpler
  if (Exporter.format === 'txt' || Exporter.format === 'md') {
    designSection.style.opacity = '0.4'
    designSection.style.pointerEvents = 'none'
  } else {
    designSection.style.opacity = '1'
    designSection.style.pointerEvents = 'auto'
  }
}

function renderChaptersList() {
  const list = document.getElementById('export-chapters-list')
  const chapters = AppState.currentProject.chapters || []

  list.innerHTML = chapters.map(ch => {
    const isSelected = Exporter.selectedChapters.includes(ch.id)
    return `
      <div class="export-chapter-item">
        <input type="checkbox" class="export-checkbox" data-chapter-id="${ch.id}" 
               ${isSelected ? 'checked' : ''} />
        <span class="export-chapter-name">${escapeHtml(ch.title)}</span>
        <span class="export-chapter-words">${formatNumber(ch.wordCount || 0)}w</span>
      </div>
    `
  }).join('')

  list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const chapterId = cb.dataset.chapterId
      if (cb.checked) {
        if (!Exporter.selectedChapters.includes(chapterId)) {
          Exporter.selectedChapters.push(chapterId)
        }
      } else {
        Exporter.selectedChapters = Exporter.selectedChapters.filter(id => id !== chapterId)
      }
      updatePreview()
    })
  })
}

// ============================================
// PREVIEW
// ============================================

function updatePreview() {
  const container = document.getElementById('export-preview-content')
  const statsEl = document.getElementById('export-preview-stats')
  const project = AppState.currentProject

  const chapters = (project.chapters || []).filter(c => Exporter.selectedChapters.includes(c.id))
  const totalWords = chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0)

  statsEl.textContent = `${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} • ${formatNumber(totalWords)} words`

  if (chapters.length === 0) {
    container.innerHTML = `
      <div class="export-preview-empty">
        <div class="export-preview-empty-icon">📄</div>
        <p>Select at least one chapter to preview</p>
      </div>
    `
    return
  }

  // Show simple preview based on format
  if (Exporter.format === 'pdf' || Exporter.format === 'docx' || Exporter.format === 'html') {
    container.innerHTML = renderBookPreview(project, chapters)
  } else if (Exporter.format === 'md') {
    container.innerHTML = `<pre style="background: white; padding: 30px; color: #222; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap; word-break: break-word;">${escapeHtml(generateMarkdown(project, chapters).substring(0, 3000))}${generateMarkdown(project, chapters).length > 3000 ? '\n\n... (preview truncated)' : ''}</pre>`
  } else if (Exporter.format === 'txt') {
    container.innerHTML = `<pre style="background: white; padding: 30px; color: #222; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.6; margin: 0; white-space: pre-wrap; word-break: break-word;">${escapeHtml(generatePlainText(project, chapters).substring(0, 3000))}${generatePlainText(project, chapters).length > 3000 ? '\n\n... (preview truncated)' : ''}</pre>`
  }
}

function renderBookPreview(project, chapters) {
  let html = ''

  // Title page
  if (Exporter.structure.titlePage) {
    html += `
      <div class="export-preview-page">
        <div class="title-page">
          <div class="title-page-title">${escapeHtml(project.title)}</div>
          ${project.author ? `<div class="title-page-author">by ${escapeHtml(project.author)}</div>` : ''}
        </div>
      </div>
    `
  }

  // Table of contents
  if (Exporter.structure.toc && chapters.length > 0) {
    html += `<div class="export-preview-page"><h1>Contents</h1>`
    chapters.forEach((ch, i) => {
      const chNum = Exporter.structure.chapterNumbers ? `Chapter ${i + 1}: ` : ''
      html += `
        <div class="toc-entry">
          <span class="toc-entry-title">${escapeHtml(chNum)}${escapeHtml(ch.title)}</span>
          <span class="toc-entry-page">${i + 3}</span>
        </div>
      `
    })
    html += `</div>`
  }

  // First chapter preview (just to show what it looks like)
  if (chapters.length > 0) {
    const ch = chapters[0]
    html += `<div class="export-preview-page">`
    html += `<div class="chapter-heading">`
    if (Exporter.structure.chapterNumbers) {
      html += `<div class="chapter-number">Chapter One</div>`
    }
    html += `<h2 class="chapter-title">${escapeHtml(ch.title)}</h2>`
    html += `</div>`

    // Convert content HTML to preview
    const preview = renderContentPreview(ch.content || '', 1500)
    html += preview

    if ((ch.content || '').length > 1500) {
      html += `<p style="text-align: center; color: #888; font-style: italic; margin-top: 30px;">... (${chapters.length - 1} more chapter${chapters.length - 1 !== 1 ? 's' : ''} not shown in preview)</p>`
    }

    html += `</div>`
  }

  return html
}

function renderContentPreview(html, maxLen) {
  // Parse HTML into simple preview
  const temp = document.createElement('div')
  temp.innerHTML = html

  let output = ''
  let charCount = 0
  let isFirstPara = true

  temp.childNodes.forEach(node => {
    if (charCount >= maxLen) return

    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase()
      const text = node.textContent

      if (charCount + text.length > maxLen) {
        const remaining = maxLen - charCount
        const truncated = text.substring(0, remaining)

        if (tag === 'p') {
          output += `<p class="${isFirstPara ? 'first-paragraph' : ''}">${escapeHtml(truncated)}...</p>`
          isFirstPara = false
        } else if (tag === 'h1' || tag === 'h2') {
          output += `<h3>${escapeHtml(truncated)}</h3>`
        }
        charCount = maxLen
        return
      }

      if (tag === 'p') {
        output += `<p class="${isFirstPara ? 'first-paragraph' : ''}">${escapeHtml(text)}</p>`
        isFirstPara = false
        charCount += text.length
      } else if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
        output += `<h3>${escapeHtml(text)}</h3>`
        charCount += text.length
      } else if (tag === 'hr' && node.classList.contains('scene-break')) {
        output += `<p class="scene-break">* * *</p>`
      } else if (tag === 'blockquote') {
        output += `<p style="font-style: italic; margin-left: 20px; text-indent: 0;">${escapeHtml(text)}</p>`
        charCount += text.length
      }
    }
  })

  return output || '<p class="first-paragraph"><em>(No content in this chapter)</em></p>'
}

// ============================================
// DO EXPORT
// ============================================

async function doExport() {
  const project = AppState.currentProject
  const chapters = (project.chapters || []).filter(c => Exporter.selectedChapters.includes(c.id))

  if (chapters.length === 0) {
    showToast('Please select at least one chapter to export', 'error')
    return
  }

  showToast('Generating export...', 'info', 2000)

  try {
    switch (Exporter.format) {
      case 'pdf':
        await exportPDF(project, chapters)
        break
      case 'docx':
        await exportDOCX(project, chapters)
        break
      case 'txt':
        exportTXT(project, chapters)
        break
      case 'md':
        exportMD(project, chapters)
        break
      case 'html':
        exportHTML(project, chapters)
        break
    }
    hideModal('modal-export')
    showToast('Export complete!', 'success')
  } catch (e) {
    console.error('Export error:', e)
    showToast('Export failed: ' + e.message, 'error')
  }
}

// ============================================
// EXPORT: TXT
// ============================================

function generatePlainText(project, chapters) {
  let text = ''

  if (Exporter.structure.titlePage) {
    text += project.title + '\n'
    if (project.author) text += 'by ' + project.author + '\n'
    text += '\n\n' + '='.repeat(60) + '\n\n\n'
  }

  if (Exporter.structure.toc) {
    text += 'CONTENTS\n\n'
    chapters.forEach((ch, i) => {
      const chNum = Exporter.structure.chapterNumbers ? `Chapter ${i + 1}: ` : ''
      text += `  ${chNum}${ch.title}\n`
    })
    text += '\n\n' + '='.repeat(60) + '\n\n\n'
  }

  chapters.forEach((ch, i) => {
    if (Exporter.structure.chapterNumbers) {
      text += `Chapter ${i + 1}\n\n`
    }
    text += ch.title + '\n\n'
    text += htmlToPlainText(ch.content || '') + '\n\n\n'
    if (i < chapters.length - 1) {
      text += '─'.repeat(50) + '\n\n\n'
    }
  })

  return text
}

function exportTXT(project, chapters) {
  const text = generatePlainText(project, chapters)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const filename = `${sanitizeFilename(project.title)}.txt`
  downloadBlob(blob, filename)
}

// ============================================
// EXPORT: MARKDOWN
// ============================================

function generateMarkdown(project, chapters) {
  let md = ''

  if (Exporter.structure.titlePage) {
    md += `# ${project.title}\n\n`
    if (project.author) md += `*by ${project.author}*\n\n`
    md += '---\n\n'
  }

  if (Exporter.structure.toc) {
    md += '## Table of Contents\n\n'
    chapters.forEach((ch, i) => {
      const chNum = Exporter.structure.chapterNumbers ? `Chapter ${i + 1}: ` : ''
      const slug = ch.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      md += `${i + 1}. [${chNum}${ch.title}](#${slug})\n`
    })
    md += '\n---\n\n'
  }

  chapters.forEach((ch, i) => {
    if (Exporter.structure.chapterNumbers) {
      md += `## Chapter ${i + 1}: ${ch.title}\n\n`
    } else {
      md += `## ${ch.title}\n\n`
    }
    md += htmlToMarkdown(ch.content || '') + '\n\n'
    if (i < chapters.length - 1) {
      md += '---\n\n'
    }
  })

  return md
}

function exportMD(project, chapters) {
  const md = generateMarkdown(project, chapters)
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  const filename = `${sanitizeFilename(project.title)}.md`
  downloadBlob(blob, filename)
}

// ============================================
// EXPORT: HTML
// ============================================

function exportHTML(project, chapters) {
  const title = escapeHtml(project.title)
  const author = escapeHtml(project.author || '')
  const fontFamily = getFontFamily(Exporter.design.font)

  let body = ''

  if (Exporter.structure.titlePage) {
    body += `
      <div class="title-page">
        <h1>${title}</h1>
        ${author ? `<p class="author">by ${author}</p>` : ''}
      </div>
      <div class="page-break"></div>
    `
  }

  if (Exporter.structure.toc) {
    body += `<h2>Contents</h2><ul class="toc">`
    chapters.forEach((ch, i) => {
      const chNum = Exporter.structure.chapterNumbers ? `Chapter ${i + 1}: ` : ''
      body += `<li><a href="#ch${i}">${chNum}${escapeHtml(ch.title)}</a></li>`
    })
    body += `</ul><div class="page-break"></div>`
  }

  chapters.forEach((ch, i) => {
    body += `<div class="chapter" id="ch${i}">`
    if (Exporter.structure.chapterNumbers) {
      body += `<p class="chapter-number">Chapter ${i + 1}</p>`
    }
    body += `<h2 class="chapter-title">${escapeHtml(ch.title)}</h2>`
    body += ch.content || ''
    body += `</div>`
    if (i < chapters.length - 1) body += `<div class="page-break"></div>`
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
body { 
  font-family: ${fontFamily}; 
  font-size: ${Exporter.design.fontSize}pt; 
  line-height: ${Exporter.design.lineSpacing}; 
  max-width: 700px; 
  margin: 40px auto; 
  padding: 20px; 
  color: #222;
}
h1 { font-size: 2.4em; text-align: center; margin: 60px 0 20px; }
h2 { font-size: 1.6em; text-align: center; margin: 40px 0 20px; }
h3 { font-size: 1.2em; margin: 24px 0 12px; }
p { text-indent: 1.5em; margin: 0 0 0.6em; text-align: justify; }
p:first-of-type, .chapter > p:first-of-type { text-indent: 0; }
.title-page { text-align: center; padding: 100px 20px; }
.title-page h1 { font-size: 3em; margin-bottom: 20px; }
.title-page .author { font-style: italic; color: #555; margin-top: 40px; font-size: 1.1em; }
.chapter-number { text-align: center; text-transform: uppercase; letter-spacing: 3px; color: #888; font-size: 0.85em; margin: 40px 0 8px; }
.chapter-title { text-align: center; font-size: 2em; margin: 0 0 40px; }
.toc { list-style: none; padding: 0; }
.toc li { padding: 8px 0; border-bottom: 1px dotted #ccc; }
.toc a { color: #333; text-decoration: none; }
.toc a:hover { color: #7c6af7; }
.page-break { page-break-after: always; height: 0; }
.scene-break { text-align: center; margin: 24px 0; letter-spacing: 8px; color: #888; border: none; }
blockquote { border-left: 3px solid #7c6af7; padding-left: 16px; font-style: italic; color: #555; margin: 1em 0; }
.character-mention { color: #7c6af7; font-weight: 500; }
</style>
</head>
<body>
${body}
</body>
</html>`

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const filename = `${sanitizeFilename(project.title)}.html`
  downloadBlob(blob, filename)
}

// ============================================
// EXPORT: PDF
// ============================================

async function exportPDF(project, chapters) {
  // Load jsPDF
  const { jsPDF } = window.jspdf

  const [width, height] = getPageDimensions(Exporter.design.pageSize)
  const margin = getMarginSize(Exporter.design.margins)

  const pdf = new jsPDF({
    unit: 'in',
    format: [width, height],
    orientation: height > width ? 'portrait' : 'landscape'
  })

  const fontFamily = getPDFFont(Exporter.design.font)
  pdf.setFont(fontFamily)

  const usableWidth = width - (margin * 2)
  const usableHeight = height - (margin * 2)
  const fontSize = Exporter.design.fontSize
  const lineHeight = fontSize * Exporter.design.lineSpacing / 72 // pts to inches

  let currentPage = 1
  let cursorY = margin

  function addPageNumber() {
    if (Exporter.structure.pageNumbers && currentPage > 1) {
      pdf.setFontSize(9)
      pdf.text(String(currentPage), width / 2, height - margin / 2, { align: 'center' })
      pdf.setFontSize(fontSize)
    }
  }

  function newPage() {
    addPageNumber()
    pdf.addPage()
    currentPage++
    cursorY = margin
  }

  function ensureRoom(needed) {
    if (cursorY + needed > height - margin) {
      newPage()
    }
  }

  // Title page
  if (Exporter.structure.titlePage) {
    pdf.setFontSize(28)
    pdf.text(project.title, width / 2, height / 3, { align: 'center', maxWidth: usableWidth })
    if (project.author) {
      pdf.setFontSize(14)
      pdf.text(`by ${project.author}`, width / 2, height / 3 + 1, { align: 'center' })
    }
    pdf.setFontSize(fontSize)
    newPage()
  }

  // Table of contents
  if (Exporter.structure.toc) {
    pdf.setFontSize(18)
    pdf.text('Contents', width / 2, margin + 0.4, { align: 'center' })
    cursorY = margin + 1.2
    pdf.setFontSize(fontSize)

    chapters.forEach((ch, i) => {
      ensureRoom(lineHeight)
      const chNum = Exporter.structure.chapterNumbers ? `Chapter ${i + 1}: ` : ''
      pdf.text(chNum + ch.title, margin, cursorY)
      cursorY += lineHeight
    })
    newPage()
  }

  // Chapters
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i]

    // Chapter heading
    cursorY += 0.5
    if (Exporter.structure.chapterNumbers) {
      pdf.setFontSize(10)
      pdf.text(`CHAPTER ${romanize(i + 1)}`, width / 2, cursorY, { align: 'center' })
      cursorY += 0.4
    }
    pdf.setFontSize(20)
    pdf.text(ch.title, width / 2, cursorY, { align: 'center', maxWidth: usableWidth })
    cursorY += 0.8
    pdf.setFontSize(fontSize)

    // Chapter content
    const paragraphs = extractParagraphs(ch.content || '')
    paragraphs.forEach((para, pi) => {
      if (para.type === 'scenebreak') {
        cursorY += lineHeight
        ensureRoom(lineHeight)
        pdf.setFontSize(fontSize + 2)
        pdf.text('* * *', width / 2, cursorY, { align: 'center' })
        pdf.setFontSize(fontSize)
        cursorY += lineHeight * 1.5
        return
      }

      const indent = pi === 0 ? 0 : 0.3
      const text = para.text
      if (!text.trim()) return

      const lines = pdf.splitTextToSize(text, usableWidth - indent)
      const blockHeight = lines.length * lineHeight

      if (cursorY + blockHeight > height - margin) {
        newPage()
      }

      pdf.text(lines, margin + indent, cursorY)
      cursorY += blockHeight + (lineHeight * 0.3)
    })

    if (i < chapters.length - 1) newPage()
  }

  addPageNumber()

  pdf.save(`${sanitizeFilename(project.title)}.pdf`)
}

// ============================================
// EXPORT: DOCX
// ============================================

async function exportDOCX(project, chapters) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak } = window.docx

  const children = []

  // Title page
  if (Exporter.structure.titlePage) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 3000, after: 400 },
      children: [new TextRun({ text: project.title, bold: true, size: 56 })]
    }))
    if (project.author) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: `by ${project.author}`, italics: true, size: 28 })]
      }))
    }
    children.push(new Paragraph({ children: [new PageBreak()] }))
  }

  // TOC
  if (Exporter.structure.toc) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 400 },
      children: [new TextRun({ text: 'Contents', bold: true, size: 40 })]
    }))
    chapters.forEach((ch, i) => {
      const chNum = Exporter.structure.chapterNumbers ? `Chapter ${i + 1}: ` : ''
      children.push(new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: chNum + ch.title, size: 24 })]
      }))
    })
    children.push(new Paragraph({ children: [new PageBreak()] }))
  }

  // Chapters
  chapters.forEach((ch, i) => {
    if (Exporter.structure.chapterNumbers) {
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600, after: 200 },
        children: [new TextRun({ text: `CHAPTER ${romanize(i + 1)}`, size: 20, characterSpacing: 100 })]
      }))
    }
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 800 },
      children: [new TextRun({ text: ch.title, bold: true, size: 40 })]
    }))

    const paragraphs = extractParagraphs(ch.content || '')
    paragraphs.forEach((para, pi) => {
      if (para.type === 'scenebreak') {
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400, after: 400 },
          children: [new TextRun({ text: '* * *', size: 24 })]
        }))
        return
      }

      if (!para.text.trim()) return

      children.push(new Paragraph({
        spacing: {
          before: 0,
          after: 200,
          line: Math.round(Exporter.design.lineSpacing * 240)
        },
        indent: pi === 0 ? undefined : { firstLine: 400 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: para.text, size: Exporter.design.fontSize * 2 })]
      }))
    })

    if (i < chapters.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }
  })

  const doc = new Document({
    sections: [{ properties: {}, children }]
  })

  const blob = await Packer.toBlob(doc)
  const filename = `${sanitizeFilename(project.title)}.docx`
  downloadBlob(blob, filename)
}

// ============================================
// HELPERS
// ============================================

function htmlToPlainText(html) {
  const temp = document.createElement('div')
  temp.innerHTML = html

  // Convert block elements to newlines
  temp.querySelectorAll('p, div, h1, h2, h3, h4, li').forEach(el => {
    el.appendChild(document.createTextNode('\n'))
  })

  // Handle scene breaks
  temp.querySelectorAll('.scene-break').forEach(el => {
    el.replaceWith(document.createTextNode('\n\n* * *\n\n'))
  })

  return temp.textContent.replace(/\n\n\n+/g, '\n\n').trim()
}

function htmlToMarkdown(html) {
  const temp = document.createElement('div')
  temp.innerHTML = html

  let md = ''

  function walk(node) {
    if (node.nodeType === 3) {
      md += node.textContent
      return
    }
    if (node.nodeType !== 1) return

    const tag = node.tagName.toLowerCase()

    if (tag === 'p') {
      Array.from(node.childNodes).forEach(walk)
      md += '\n\n'
    } else if (tag === 'h1') {
      md += '\n# '; Array.from(node.childNodes).forEach(walk); md += '\n\n'
    } else if (tag === 'h2') {
      md += '\n## '; Array.from(node.childNodes).forEach(walk); md += '\n\n'
    } else if (tag === 'h3') {
      md += '\n### '; Array.from(node.childNodes).forEach(walk); md += '\n\n'
    } else if (tag === 'strong' || tag === 'b') {
      md += '**'; Array.from(node.childNodes).forEach(walk); md += '**'
    } else if (tag === 'em' || tag === 'i') {
      md += '*'; Array.from(node.childNodes).forEach(walk); md += '*'
    } else if (tag === 'blockquote') {
      md += '\n> '; Array.from(node.childNodes).forEach(walk); md += '\n\n'
    } else if (tag === 'ul') {
      Array.from(node.childNodes).forEach(child => {
        if (child.tagName === 'LI') {
          md += '- '; Array.from(child.childNodes).forEach(walk); md += '\n'
        }
      })
      md += '\n'
    } else if (tag === 'ol') {
      let num = 1
      Array.from(node.childNodes).forEach(child => {
        if (child.tagName === 'LI') {
          md += `${num}. `; Array.from(child.childNodes).forEach(walk); md += '\n'
          num++
        }
      })
      md += '\n'
    } else if (tag === 'hr' && node.classList.contains('scene-break')) {
      md += '\n\n* * *\n\n'
    } else {
      Array.from(node.childNodes).forEach(walk)
    }
  }

  Array.from(temp.childNodes).forEach(walk)
  return md.replace(/\n\n\n+/g, '\n\n').trim()
}

function extractParagraphs(html) {
  const temp = document.createElement('div')
  temp.innerHTML = html

  const paragraphs = []

  temp.childNodes.forEach(node => {
    if (node.nodeType !== 1) return
    const tag = node.tagName.toLowerCase()

    if (tag === 'hr' && node.classList.contains('scene-break')) {
      paragraphs.push({ type: 'scenebreak' })
    } else if (['p', 'h1', 'h2', 'h3', 'blockquote', 'div'].includes(tag)) {
      const text = node.textContent.trim()
      if (text) paragraphs.push({ type: 'text', text })
    }
  })

  return paragraphs
}

function getPageDimensions(size) {
  switch (size) {
    case 'a4': return [8.27, 11.69]
    case 'letter': return [8.5, 11]
    case '5x8': return [5, 8]
    case '6x9': return [6, 9]
    default: return [8.5, 11]
  }
}

function getMarginSize(margin) {
  switch (margin) {
    case 'narrow': return 0.5
    case 'normal': return 1
    case 'wide': return 1.5
    default: return 1
  }
}

function getFontFamily(font) {
  const map = {
    georgia: '"Georgia", serif',
    times: '"Times New Roman", serif',
    garamond: '"Garamond", "EB Garamond", serif',
    helvetica: '"Helvetica", "Arial", sans-serif',
    courier: '"Courier New", monospace',
  }
  return map[font] || 'serif'
}

function getPDFFont(font) {
  // jsPDF has limited built-in fonts
  const map = {
    georgia: 'times',
    times: 'times',
    garamond: 'times',
    helvetica: 'helvetica',
    courier: 'courier',
  }
  return map[font] || 'times'
}

function sanitizeFilename(name) {
  return (name || 'export').replace(/[^a-z0-9]/gi, '_').substring(0, 60)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function romanize(num) {
  const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 }
  let str = ''
  for (const [key, val] of Object.entries(roman)) {
    while (num >= val) {
      str += key
      num -= val
    }
  }
  return str
}