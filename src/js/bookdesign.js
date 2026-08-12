// bookdesign.js
// Book Design v2 — sidebar view with live preview and export

const BookDesign = {
    format: 'pdf',
    selectedChapters: [],
    settings: {
        font: 'Georgia, serif',
        fontSize: 14,
        lineSpacing: 1.8,
        indent: '1.5em',
        alignment: 'justify',
        titlePage: true,
        toc: true,
        chapterNumbers: true,
        pageNumbers: true,
    }
}

function initBookDesign() {
    // Format buttons
    document.querySelectorAll('.bd-format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bd-format-btn').forEach(b => b.classList.remove('selected'))
            btn.classList.add('selected')
            BookDesign.format = btn.dataset.format

            const designSection = document.getElementById('bd-design-section')
            if (BookDesign.format === 'txt' || BookDesign.format === 'md') {
                designSection.style.opacity = '0.4'
                designSection.style.pointerEvents = 'none'
            } else {
                designSection.style.opacity = '1'
                designSection.style.pointerEvents = 'auto'
            }
        })
    })

    // Design controls
    document.getElementById('bd-font').addEventListener('change', (e) => {
        BookDesign.settings.font = e.target.value
        updateBookPreview()
    })

    document.getElementById('bd-fontsize').addEventListener('input', (e) => {
        BookDesign.settings.fontSize = parseInt(e.target.value)
        document.getElementById('bd-fontsize-val').textContent = e.target.value + 'px'
        updateBookPreview()
    })

    document.getElementById('bd-linespacing').addEventListener('input', (e) => {
        BookDesign.settings.lineSpacing = parseInt(e.target.value) / 10
        document.getElementById('bd-linespacing-val').textContent = BookDesign.settings.lineSpacing.toFixed(1)
        updateBookPreview()
    })

    document.getElementById('bd-indent').addEventListener('change', (e) => {
        BookDesign.settings.indent = e.target.value
        updateBookPreview()
    })

    document.getElementById('bd-alignment').addEventListener('change', (e) => {
        BookDesign.settings.alignment = e.target.value
        updateBookPreview()
    })

        // Structure checkboxes
        ;['bd-title-page', 'bd-toc', 'bd-chapter-numbers', 'bd-page-numbers'].forEach(id => {
            document.getElementById(id).addEventListener('change', (e) => {
                const key = id.replace('bd-', '').replace(/-([a-z])/g, (m, c) => c.toUpperCase())
                BookDesign.settings[key] = e.target.checked
                updateBookPreview()
            })
        })

    // Chapter selection
    document.getElementById('bd-select-all').addEventListener('click', () => {
        BookDesign.selectedChapters = (AppState.currentProject?.chapters || []).map(c => c.id)
        renderBookChaptersList()
        updateBookPreview()
    })
    document.getElementById('bd-select-none').addEventListener('click', () => {
        BookDesign.selectedChapters = []
        renderBookChaptersList()
        updateBookPreview()
    })

    // Export
    document.getElementById('bd-export-btn').addEventListener('click', doBookExport)
}

// ============================================
// SHOW VIEW
// ============================================

function showBookDesignView() {
    if (!AppState.currentProject) return

    // Default: select all chapters
    BookDesign.selectedChapters = (AppState.currentProject.chapters || []).map(c => c.id)

    renderBookChaptersList()
    updateBookPreview()
}

// ============================================
// CHAPTERS LIST
// ============================================

function renderBookChaptersList() {
    const list = document.getElementById('bd-chapters-list')
    const chapters = AppState.currentProject?.chapters || []

    list.innerHTML = chapters.map(ch => {
        const selected = BookDesign.selectedChapters.includes(ch.id)
        return `
      <div class="bd-chapter-item">
        <input type="checkbox" data-chapter-id="${ch.id}" ${selected ? 'checked' : ''} 
               style="width:14px;height:14px;accent-color:var(--accent-primary);cursor:pointer;" />
        <span class="bd-chapter-name">${escapeHtml(ch.title)}</span>
        <span class="bd-chapter-words">${formatNumber(ch.wordCount || 0)}w</span>
      </div>
    `
    }).join('')

    list.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
            const id = cb.dataset.chapterId
            if (cb.checked) {
                if (!BookDesign.selectedChapters.includes(id)) BookDesign.selectedChapters.push(id)
            } else {
                BookDesign.selectedChapters = BookDesign.selectedChapters.filter(c => c !== id)
            }
            updateChaptersCount()
            updateBookPreview()
        })
    })

    updateChaptersCount()
}

function updateChaptersCount() {
    const total = AppState.currentProject?.chapters?.length || 0
    const selected = BookDesign.selectedChapters.length
    document.getElementById('bd-chapters-count').textContent = `${selected} of ${total} selected`
}

// ============================================
// PREVIEW
// ============================================

function updateBookPreview() {
    const container = document.getElementById('bd-preview-content')
    const statsEl = document.getElementById('bd-preview-stats')
    const project = AppState.currentProject

    if (!project) {
        container.innerHTML = '<div class="bd-empty-state"><div class="bd-empty-state-icon">📖</div><h3>No project open</h3></div>'
        return
    }

    const chapters = (project.chapters || []).filter(c => BookDesign.selectedChapters.includes(c.id))
    const totalWords = chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0)

    statsEl.textContent = `${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} · ${formatNumber(totalWords)} words`

    if (chapters.length === 0) {
        container.innerHTML = '<div class="bd-empty-state"><div class="bd-empty-state-icon">📄</div><h3>Select chapters to preview</h3><p>Check at least one chapter from the list on the left</p></div>'
        return
    }

    // Apply design settings to the preview container
    container.style.fontFamily = BookDesign.settings.font
    container.style.fontSize = BookDesign.settings.fontSize + 'px'
    container.style.lineHeight = BookDesign.settings.lineSpacing

    let html = ''

    // Title page
    if (BookDesign.settings.titlePage) {
        html += `
      <div class="bd-title-page">
        <h1>${escapeHtml(project.title)}</h1>
        ${project.author ? `<div class="bd-author">by ${escapeHtml(project.author)}</div>` : ''}
      </div>
      <hr class="bd-chapter-divider" />
    `
    }

    // Table of contents
    if (BookDesign.settings.toc) {
        html += `<div class="bd-toc"><h2>Contents</h2>`
        chapters.forEach((ch, i) => {
            const num = BookDesign.settings.chapterNumbers ? `Chapter ${i + 1}: ` : ''
            html += `<div class="bd-toc-entry"><span>${escapeHtml(num + ch.title)}</span><span>${i + 2}</span></div>`
        })
        html += `</div><hr class="bd-chapter-divider" />`
    }

    // Chapters
    chapters.forEach((ch, i) => {
        html += `<div class="bd-chapter-heading">`
        if (BookDesign.settings.chapterNumbers) {
            html += `<div class="bd-chapter-number">Chapter ${numberToWord(i + 1)}</div>`
        }
        html += `<h2 class="bd-chapter-title">${escapeHtml(ch.title)}</h2></div>`

        // Chapter content — PRESERVE formatting
        let content = ch.content || '<p><em>(Empty chapter)</em></p>'

        // Apply indent and alignment styles to paragraphs
        html += `<div class="bd-chapter-content" style="text-indent: ${BookDesign.settings.indent}; text-align: ${BookDesign.settings.alignment};">`
        html += content
        html += `</div>`

        if (BookDesign.settings.pageNumbers) {
            html += `<div class="bd-page-number">${i + (BookDesign.settings.titlePage ? 3 : 1)}</div>`
        }

        if (i < chapters.length - 1) {
            html += `<hr class="bd-chapter-divider" />`
        }
    })

    container.innerHTML = html

    // Fix: first paragraph of each chapter should NOT be indented
    container.querySelectorAll('.bd-chapter-content').forEach(content => {
        const firstP = content.querySelector('p')
        if (firstP) firstP.style.textIndent = '0'
    })

    // Fix: remove character mention coloring in preview
    container.querySelectorAll('.character-mention').forEach(mention => {
        mention.style.color = 'inherit'
        mention.style.borderBottom = 'none'
        mention.style.background = 'none'
    })
}

function numberToWord(n) {
    const words = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
        'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty',
        'Twenty-One', 'Twenty-Two', 'Twenty-Three', 'Twenty-Four', 'Twenty-Five']
    return n <= 25 ? words[n] : String(n)
}

// ============================================
// EXPORT
// ============================================

async function doBookExport() {
    const project = AppState.currentProject
    if (!project) return

    const chapters = (project.chapters || []).filter(c => BookDesign.selectedChapters.includes(c.id))
    if (chapters.length === 0) {
        showToast('Select at least one chapter', 'error')
        return
    }

    showToast('Generating export...', 'info', 2000)

    try {
        switch (BookDesign.format) {
            case 'pdf':
                exportBookPDF(project, chapters)
                break
            case 'docx':
                exportBookDOCX(project, chapters)
                break
            case 'html':
                exportBookHTML(project, chapters)
                break
            case 'txt':
                exportBookTXT(project, chapters)
                break
            case 'md':
                exportBookMD(project, chapters)
                break
        }
        showToast('Export complete!', 'success')
    } catch (e) {
        console.error('Export error:', e)
        showToast('Export failed: ' + e.message, 'error')
    }
}

// PDF — use print dialog (preserves ALL formatting perfectly)
function exportBookPDF(project, chapters) {
    const printWindow = window.open('', '_blank')
    const htmlContent = generateBookHTML(project, chapters)

    printWindow.document.write(htmlContent)
    printWindow.document.close()

    printWindow.onload = () => {
        printWindow.print()
    }
}

// HTML export
function exportBookHTML(project, chapters) {
    const html = generateBookHTML(project, chapters)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    downloadBlob(blob, `${sanitizeFilename(project.title)}.html`)
}

// TXT export
function exportBookTXT(project, chapters) {
    let text = ''

    if (BookDesign.settings.titlePage) {
        text += project.title + '\n'
        if (project.author) text += 'by ' + project.author + '\n'
        text += '\n' + '='.repeat(50) + '\n\n'
    }

    if (BookDesign.settings.toc) {
        text += 'CONTENTS\n\n'
        chapters.forEach((ch, i) => {
            const num = BookDesign.settings.chapterNumbers ? `Chapter ${i + 1}: ` : ''
            text += `  ${num}${ch.title}\n`
        })
        text += '\n' + '='.repeat(50) + '\n\n'
    }

    chapters.forEach((ch, i) => {
        if (BookDesign.settings.chapterNumbers) {
            text += `Chapter ${i + 1}\n`
        }
        text += ch.title + '\n\n'
        text += htmlToPlainText(ch.content || '') + '\n\n'
        if (i < chapters.length - 1) text += '─'.repeat(40) + '\n\n'
    })

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    downloadBlob(blob, `${sanitizeFilename(project.title)}.txt`)
}

// MD export
function exportBookMD(project, chapters) {
    let md = ''

    if (BookDesign.settings.titlePage) {
        md += `# ${project.title}\n\n`
        if (project.author) md += `*by ${project.author}*\n\n`
        md += '---\n\n'
    }

    if (BookDesign.settings.toc) {
        md += '## Contents\n\n'
        chapters.forEach((ch, i) => {
            const num = BookDesign.settings.chapterNumbers ? `Chapter ${i + 1}: ` : ''
            md += `${i + 1}. ${num}${ch.title}\n`
        })
        md += '\n---\n\n'
    }

    chapters.forEach((ch, i) => {
        if (BookDesign.settings.chapterNumbers) {
            md += `## Chapter ${i + 1}: ${ch.title}\n\n`
        } else {
            md += `## ${ch.title}\n\n`
        }
        md += htmlToMarkdown(ch.content || '') + '\n\n'
        if (i < chapters.length - 1) md += '---\n\n'
    })

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    downloadBlob(blob, `${sanitizeFilename(project.title)}.md`)
}

// Generate full HTML document for PDF/HTML export
function generateBookHTML(project, chapters) {
    const s = BookDesign.settings

    let body = ''

    if (s.titlePage) {
        body += `<div class="title-page"><h1>${escapeHtml(project.title)}</h1>`
        if (project.author) body += `<p class="author">by ${escapeHtml(project.author)}</p>`
        body += `</div><div class="page-break"></div>`
    }

    if (s.toc) {
        body += `<h2 class="toc-heading">Contents</h2><ul class="toc">`
        chapters.forEach((ch, i) => {
            const num = s.chapterNumbers ? `Chapter ${i + 1}: ` : ''
            body += `<li>${escapeHtml(num + ch.title)}</li>`
        })
        body += `</ul><div class="page-break"></div>`
    }

    chapters.forEach((ch, i) => {
        body += `<div class="chapter">`
        if (s.chapterNumbers) {
            body += `<p class="chapter-number">Chapter ${numberToWord(i + 1)}</p>`
        }
        body += `<h2 class="chapter-title">${escapeHtml(ch.title)}</h2>`
        body += `<div class="chapter-content">${ch.content || ''}</div>`
        body += `</div>`
        if (i < chapters.length - 1) body += `<div class="page-break"></div>`
    })

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(project.title)}</title>
<style>
@page { margin: 1in; }
body { 
  font-family: ${s.font}; 
  font-size: ${s.fontSize}pt; 
  line-height: ${s.lineSpacing}; 
  color: #222;
  max-width: 700px;
  margin: 40px auto;
  padding: 20px;
}
h1, h2, h3 { color: #111; }
.title-page { text-align: center; padding: 100px 20px; }
.title-page h1 { font-size: 3em; margin-bottom: 20px; }
.title-page .author { font-style: italic; color: #555; font-size: 1.2em; margin-top: 40px; }
.toc-heading { text-align: center; margin-bottom: 20px; }
.toc { list-style: none; padding: 0; }
.toc li { padding: 8px 0; border-bottom: 1px dotted #ccc; }
.chapter-number { text-align: center; text-transform: uppercase; letter-spacing: 3px; color: #888; font-size: 0.85em; margin: 40px 0 8px; }
.chapter-title { text-align: center; font-size: 2em; margin: 0 0 40px; }
.chapter-content p { text-indent: ${s.indent}; text-align: ${s.alignment}; margin: 0 0 0.8em; }
.chapter-content p:first-child { text-indent: 0; }
.chapter-content strong, .chapter-content b { font-weight: 700; }
.chapter-content em, .chapter-content i { font-style: italic; }
.chapter-content u { text-decoration: underline; }
.chapter-content blockquote { border-left: 3px solid #999; padding-left: 16px; font-style: italic; color: #555; margin: 1em 0; text-indent: 0; }
.chapter-content .scene-break { text-align: center; margin: 2em 0; letter-spacing: 6px; color: #888; border: none; background: transparent; display: block; font-size: 18px; }
.chapter-content .scene-break[data-style="asterisks"]::before { content: '* * *'; }
.chapter-content .scene-break[data-style="dots"]::before { content: '• • •'; }
.chapter-content .scene-break[data-style="dashes"]::before { content: '— — —'; }
.chapter-content .scene-break[data-style="ornament"]::before { content: '❦'; font-size: 24px; letter-spacing: 0; }
.chapter-content .scene-break[data-style="flourish"]::before { content: '❋'; font-size: 22px; letter-spacing: 0; }
.chapter-content .scene-break[data-style="line"] { height: 1px; background: #ccc; max-width: 100px; margin: 2.5em auto; }
.chapter-content .scene-break[data-style="line"]::before { content: ''; }
.character-mention { color: inherit !important; font-weight: inherit !important; border: none !important; border-bottom: none !important; background: none !important; }
span[data-character-id] { color: inherit !important; }
.page-break { page-break-after: always; height: 0; }
@media print {
  body { max-width: none; margin: 0; padding: 0; }
  .page-break { page-break-after: always; }
}
</style>
</head>
<body>${body}</body>
</html>`
}

// Helper: HTML to plain text
function htmlToPlainText(html) {
    const temp = document.createElement('div')
    temp.innerHTML = html

    temp.querySelectorAll('p, div, h1, h2, h3, h4, li').forEach(el => {
        el.appendChild(document.createTextNode('\n'))
    })
    temp.querySelectorAll('.scene-break, hr').forEach(el => {
        el.replaceWith(document.createTextNode('\n\n* * *\n\n'))
    })

    return temp.textContent.replace(/\n\n\n+/g, '\n\n').trim()
}

// Helper: HTML to Markdown
function htmlToMarkdown(html) {
    const temp = document.createElement('div')
    temp.innerHTML = html

    let md = ''

    function walk(node) {
        if (node.nodeType === 3) { md += node.textContent; return }
        if (node.nodeType !== 1) return

        const tag = node.tagName.toLowerCase()

        if (tag === 'p') { Array.from(node.childNodes).forEach(walk); md += '\n\n' }
        else if (tag === 'h1') { md += '\n# '; Array.from(node.childNodes).forEach(walk); md += '\n\n' }
        else if (tag === 'h2') { md += '\n## '; Array.from(node.childNodes).forEach(walk); md += '\n\n' }
        else if (tag === 'h3') { md += '\n### '; Array.from(node.childNodes).forEach(walk); md += '\n\n' }
        else if (tag === 'strong' || tag === 'b') { md += '**'; Array.from(node.childNodes).forEach(walk); md += '**' }
        else if (tag === 'em' || tag === 'i') { md += '*'; Array.from(node.childNodes).forEach(walk); md += '*' }
        else if (tag === 'blockquote') { md += '\n> '; Array.from(node.childNodes).forEach(walk); md += '\n\n' }
        else if (tag === 'hr' && node.classList.contains('scene-break')) { md += '\n\n* * *\n\n' }
        else { Array.from(node.childNodes).forEach(walk) }
    }

    Array.from(temp.childNodes).forEach(walk)
    return md.replace(/\n\n\n+/g, '\n\n').trim()
}

function sanitizeFilename(name) {
    return (name || 'export').replace(/[^a-z0-9]/gi, '_').substring(0, 60)
}

// DOCX export — uses the docx npm library via Electron's Node integration
async function exportBookDOCX(project, chapters) {
    try {
        // Ask the main process to generate the DOCX for us
        const result = await window.electronAPI.exportDOCX({
            project: {
                title: project.title,
                author: project.author || '',
            },
            chapters: chapters.map((ch, i) => ({
                title: ch.title,
                content: htmlToPlainTextPreserveStructure(ch.content || ''),
                index: i,
            })),
            settings: BookDesign.settings,
        })

        if (result.success) {
            showToast('DOCX exported!', 'success')
        } else {
            showToast('DOCX export failed: ' + (result.error || 'Unknown error'), 'error')
        }
    } catch (e) {
        console.error('DOCX export error:', e)
        showToast('DOCX export failed', 'error')
    }
}

// Convert HTML to structured plain text (preserves paragraphs, headings, scene breaks)
function htmlToPlainTextPreserveStructure(html) {
    if (!html || !html.trim()) return []

    const temp = document.createElement('div')
    temp.innerHTML = html

    const blocks = []

    function processNode(node) {
        if (node.nodeType === 3) {
            // Plain text node
            const text = node.textContent.trim()
            if (text) {
                blocks.push({ type: 'paragraph', text: text, bold: false, italic: false, underline: false })
            }
            return
        }

        if (node.nodeType !== 1) return

        const tag = node.tagName.toLowerCase()

        if (tag === 'hr' && node.classList.contains('scene-break')) {
            const style = node.getAttribute('data-style') || 'asterisks'
            const symbols = {
                'asterisks': '* * *',
                'dots': '• • •',
                'dashes': '— — —',
                'ornament': '❦',
                'flourish': '❋',
                'line': '───',
            }
            blocks.push({ type: 'scenebreak', text: symbols[style] || '* * *' })
        } else if (tag === 'h1') {
            const text = node.textContent.trim()
            if (text) blocks.push({ type: 'h1', text: text })
        } else if (tag === 'h2') {
            const text = node.textContent.trim()
            if (text) blocks.push({ type: 'h2', text: text })
        } else if (tag === 'h3') {
            const text = node.textContent.trim()
            if (text) blocks.push({ type: 'h3', text: text })
        } else if (tag === 'blockquote') {
            const text = node.textContent.trim()
            if (text) blocks.push({ type: 'blockquote', text: text })
        } else if (tag === 'p' || tag === 'div') {
            const text = node.textContent.trim()
            if (text) {
                const hasStrong = !!node.querySelector('strong, b')
                const hasEm = !!node.querySelector('em, i')
                const hasU = !!node.querySelector('u')
                blocks.push({
                    type: 'paragraph',
                    text: text,
                    bold: hasStrong,
                    italic: hasEm,
                    underline: hasU,
                })
            }
        } else if (tag === 'ul' || tag === 'ol') {
            node.querySelectorAll('li').forEach(li => {
                const text = li.textContent.trim()
                if (text) blocks.push({ type: 'listitem', text: text })
            })
        } else if (tag === 'br') {
            // Skip line breaks
        } else {
            // For any other element (span, strong, em, etc.), 
            // check if it has block-level children. If not, treat as paragraph.
            const hasBlockChildren = node.querySelector('p, div, h1, h2, h3, blockquote, ul, ol, hr')
            if (hasBlockChildren) {
                // Recurse into children
                node.childNodes.forEach(child => processNode(child))
            } else {
                const text = node.textContent.trim()
                if (text) {
                    blocks.push({ type: 'paragraph', text: text, bold: false, italic: false, underline: false })
                }
            }
        }
    }

    temp.childNodes.forEach(child => processNode(child))

    // If nothing was found, try to extract ALL text as one paragraph
    if (blocks.length === 0) {
        const allText = temp.textContent.trim()
        if (allText) {
            blocks.push({ type: 'paragraph', text: allText, bold: false, italic: false, underline: false })
        }
    }

    return blocks
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