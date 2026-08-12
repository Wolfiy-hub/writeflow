// analysis.js
// Prose analysis & highlighting - v3 with proper repetition detection

const Analysis = {
  panelOpen: false,
  enabledCategories: {
    adverbs: false,
    filter: false,
    passive: false,
    cliche: false,
    repetition: false,
    longSentence: false,
    similarMeaning: false,
  },
  refreshTimer: null,
  lastResults: null,
  repetitionGroups: [], // For displaying which words are repeated
}

// ============================================
// DICTIONARIES
// ============================================

const FILTER_WORDS_SINGLE = new Set([
  'very', 'really', 'just', 'quite', 'somewhat', 'rather', 'actually',
  'literally', 'basically', 'perhaps', 'maybe', 'possibly', 'probably',
  'seems', 'seemed', 'appear', 'appeared', 'appears', 'appearing',
  'nice', 'thing', 'stuff', 'that',
])

const FILTER_PHRASES = [
  'kind of', 'sort of', 'a bit', 'a little', 'started to', 'began to', 'was able to',
]

const CLICHES = [
  'at the end of the day', 'in the nick of time', 'nick of time',
  'time will tell', 'better late than never', 'a blessing in disguise',
  'a dime a dozen', 'beat around the bush', 'once in a blue moon',
  'piece of cake', 'break the ice', 'the ball is in your court',
  'the best of both worlds', 'the last straw', 'costs an arm and a leg',
  'once upon a time', 'happily ever after', 'in the blink of an eye',
  'read between the lines', 'lost in translation', 'from time to time',
  'as luck would have it', 'as fate would have it',
  'heart skipped a beat', 'blood ran cold',
  'a sight for sore eyes', 'diamond in the rough', 'silver lining',
  'the calm before the storm', 'when it rains it pours', 'sink or swim',
  'time flies when', 'the writing on the wall', 'without a shadow of a doubt',
  'stopped dead in his tracks', 'stopped dead in her tracks',
  'burning the midnight oil', 'the tip of the iceberg', 'a chip on his shoulder',
  'in the same boat', 'lightning fast',
  'took a deep breath', 'let out a sigh', 'let out a breath',
  'shook his head', 'shook her head', 'rolled her eyes', 'rolled his eyes',
  'took a step back', 'his eyes narrowed', 'her eyes narrowed',
  'his eyes widened', 'her eyes widened',
  'raised an eyebrow', 'raised his eyebrow', 'raised her eyebrow',
  'without a word', 'nodded silently',
  'shrugged his shoulders', 'shrugged her shoulders',
  'a shiver ran down', 'chill ran down',
  'butterflies in her stomach', 'butterflies in his stomach',
  'lost in thought', 'deep in thought',
  'the pit of his stomach', 'the pit of her stomach',
  'plain as day', 'crystal clear',
  'like a moth to a flame', 'love at first sight',
  'add insult to injury', 'agree to disagree', "all in a day's work",
  'as old as time', 'avoid like the plague', 'back to square one',
  'burning bridges', 'by hook or by crook', 'calm before the storm',
  'come hell or high water', 'cut to the chase', 'down in the dumps',
  'easier said than done', 'every cloud has a silver lining',
  'few and far between', 'fit as a fiddle', 'food for thought',
  'get out of hand', 'give it your all', 'green with envy',
  'hit the nail on the head', 'it takes two to tango', 'jump the gun',
  'kill two birds with one stone', 'last but not least',
  'let sleeping dogs lie', 'like a fish out of water',
  'make ends meet', 'more than meets the eye', 'nip in the bud',
  'no pain no gain', 'off the beaten path', 'on cloud nine',
  'on the same page', 'over the moon', 'part and parcel',
  'raining cats and dogs', 'right as rain', 'run out of steam',
  'saved by the bell', 'see eye to eye', 'set in stone',
  'skating on thin ice', 'sleep like a log', 'speak of the devil',
  'stab in the back', 'still waters run deep', 'take it or leave it',
  'the elephant in the room', 'think outside the box',
  'through thick and thin', 'time heals all wounds',
  'to make a long story short', 'under the weather',
  'walking on eggshells', 'water under the bridge', 'when pigs fly',
  'wild goose chase',
  'guilty until proven innocent', 'innocent until proven guilty',
]

const NON_ADVERB_LY = new Set([
  'only', 'family', 'reply', 'apply', 'supply', 'imply', 'holy', 'ugly',
  'friendly', 'lovely', 'lonely', 'silly', 'jelly', 'belly', 'ally',
  'rally', 'valley', 'gully', 'bully', 'lily',
])

// Words to EXCLUDE from repetition detection (too common or structural)
const REPETITION_EXCLUDES = new Set([
  'about', 'other', 'their', 'there', 'these', 'those', 'which', 'would',
  'could', 'should', 'where', 'while', 'after', 'before', 'again',
  'because', 'through', 'against', 'between', 'during', 'without',
  'having', 'being', 'never', 'always', 'every', 'first', 'still',
  'right', 'think', 'thought', 'people', 'looked', 'seemed', 'looking',
  'himself', 'herself', 'myself', 'yourself', 'themselves',
  'something', 'nothing', 'anything', 'everything',
  'don\'t', 'didn\'t', 'won\'t', 'can\'t', 'isn\'t', 'aren\'t', 'wasn\'t', 'weren\'t',
  'hasn\'t', 'haven\'t', 'hadn\'t', 'shouldn\'t', 'wouldn\'t', 'couldn\'t',
  'said', 'says', 'asked', 'told', 'came', 'went', 'made', 'done',
  'this', 'they', 'them', 'that', 'with', 'from', 'have', 'were',
  'been', 'will', 'want', 'more', 'when', 'what', 'like', 'know',
  'just', 'well', 'even', 'here', 'much', 'over', 'also',
])

const ADVERB_GROUPS = {
  sudden: ['suddenly', 'abruptly', 'unexpectedly', 'immediately', 'instantly'],
  slow: ['slowly', 'gradually', 'lazily', 'unhurriedly'],
  loud: ['loudly', 'noisily', 'boisterously'],
  quiet: ['quietly', 'silently', 'softly'],
  quick: ['quickly', 'rapidly', 'swiftly', 'briskly', 'hastily'],
  angry: ['angrily', 'furiously'],
  complete: ['completely', 'utterly', 'totally', 'entirely', 'absolutely'],
}

const CATEGORY_INFO = {
  adverbs: {
    name: 'Adverbs',
    desc: 'Adverbs ending in "-ly" often weaken your prose. Consider using a stronger verb instead.',
  },
  filter: {
    name: 'Weak / Filter Words',
    desc: 'Words like "very", "just", "really" often add nothing. Remove them for tighter prose.',
  },
  passive: {
    name: 'Passive Voice',
    desc: 'Passive voice ("was killed" vs "killed him") is often weaker. Use active voice when possible.',
  },
  cliche: {
    name: 'Clichés',
    desc: 'Overused phrases that make writing feel stale. Try to express the idea in a fresh way.',
  },
  repetition: {
    name: 'Word Repetition',
    desc: 'The same distinctive word used 3+ times within a short passage. Vary your vocabulary.',
  },
  similarMeaning: {
    name: 'Overused Adverb Types',
    desc: 'Similar-meaning adverbs used close together (e.g., "suddenly" and "abruptly").',
  },
  longSentence: {
    name: 'Long Sentences',
    desc: 'Sentences over 30 words can be hard to read. Consider breaking them up.',
  },
}

// ============================================
// INITIALIZATION
// ============================================

function initAnalysis() {
  document.getElementById('btn-analysis').addEventListener('click', togglePanel)
  document.getElementById('analysis-panel-close').addEventListener('click', closePanel)
  
  renderCategoryToggles()
  
  if (Editor.contentEl) {
    Editor.contentEl.addEventListener('input', scheduleRefresh)
  } else {
    setTimeout(initAnalysis, 500)
  }
}

// ============================================
// PANEL
// ============================================

function togglePanel() {
  if (!AppState.currentChapter) {
    showToast('Open a chapter first', 'info')
    return
  }
  if (Analysis.panelOpen) closePanel()
  else openPanel()
}

function openPanel() {
  Analysis.panelOpen = true
  document.getElementById('analysis-panel').classList.add('open')
  document.getElementById('btn-analysis').classList.add('active')
  document.body.classList.add('analysis-panel-open')
  refreshAnalysis()
}

function closePanel() {
  Analysis.panelOpen = false
  document.getElementById('analysis-panel').classList.remove('open')
  document.getElementById('btn-analysis').classList.remove('active')
  document.body.classList.remove('analysis-panel-open')
  
  Object.keys(Analysis.enabledCategories).forEach(k => {
    Analysis.enabledCategories[k] = false
  })
  renderCategoryToggles()
  updateRepetitionDetails()
  clearHighlights()
}

// ============================================
// CATEGORIES UI
// ============================================

function renderCategoryToggles() {
  const container = document.getElementById('analysis-categories')
  
  container.innerHTML = Object.keys(CATEGORY_INFO).map(key => {
    const info = CATEGORY_INFO[key]
    const enabled = Analysis.enabledCategories[key]
    const count = Analysis.lastResults?.[key]?.length || 0
    
    return `
      <div class="analysis-category ${enabled ? 'enabled' : ''}" data-category="${key}">
        <div class="analysis-category-header">
          <div class="analysis-category-swatch"></div>
          <div class="analysis-category-name">${info.name}</div>
          <div class="analysis-category-count">${count}</div>
          <button class="analysis-category-toggle" data-category="${key}"></button>
        </div>
        <div class="analysis-category-desc">${info.desc}</div>
      </div>
    `
  }).join('')
  
  container.querySelectorAll('.analysis-category-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const category = btn.dataset.category
      Analysis.enabledCategories[category] = !Analysis.enabledCategories[category]
      renderCategoryToggles()
      updateRepetitionDetails()
      applyHighlights()
    })
  })
  
  container.querySelectorAll('.analysis-category-header').forEach(header => {
    header.addEventListener('click', () => {
      const category = header.parentElement.dataset.category
      Analysis.enabledCategories[category] = !Analysis.enabledCategories[category]
      renderCategoryToggles()
      updateRepetitionDetails()
      applyHighlights()
    })
  })
}

function updateRepetitionDetails() {
  const details = document.getElementById('repetition-details')
  const list = document.getElementById('repetition-list')
  
  if (!Analysis.enabledCategories.repetition || !Analysis.repetitionGroups.length) {
    details.style.display = 'none'
    return
  }
  
  details.style.display = 'block'
  
  list.innerHTML = Analysis.repetitionGroups.map(group => `
    <div class="repetition-item">
      <span class="repetition-word">"${escapeHtml(group.word)}"</span>
      <span class="repetition-count">${group.count}× used</span>
    </div>
  `).join('')
}

// ============================================
// REFRESH
// ============================================

function scheduleRefresh() {
  if (!Analysis.panelOpen) return
  clearTimeout(Analysis.refreshTimer)
  Analysis.refreshTimer = setTimeout(refreshAnalysis, 500)
}

function refreshAnalysis() {
  if (!Editor.contentEl) return
  
  clearHighlights()
  
  const text = getEditorText()
  
  if (!text.trim()) {
    showEmptyState()
    return
  }
  
  Analysis.lastResults = analyzeText(text)
  renderReadability(Analysis.lastResults.readability)
  renderStats(Analysis.lastResults)
  renderCategoryToggles()
  updateRepetitionDetails()
  applyHighlights()
}

function showEmptyState() {
  document.getElementById('readability-score').textContent = '—'
  document.getElementById('readability-label').textContent = 'Nothing to analyze yet'
  document.getElementById('readability-fill').style.width = '0%'
  document.getElementById('readability-desc').textContent = 'Write something to see analysis'
  document.getElementById('readability-grade').style.display = 'none'
  document.getElementById('analysis-stats').innerHTML = ''
  Analysis.lastResults = null
  Analysis.repetitionGroups = []
  renderCategoryToggles()
  updateRepetitionDetails()
}

// ============================================
// TEXT EXTRACTION (matches highlight walker)
// ============================================

function getEditorText() {
  if (!Editor.contentEl) return ''
  
  const walker = document.createTreeWalker(Editor.contentEl, NodeFilter.SHOW_TEXT, null, false)
  let text = ''
  let node
  let prevParent = null
  
  while (node = walker.nextNode()) {
    const parent = getBlockParent(node)
    if (parent && parent !== prevParent && prevParent !== null) {
      text += '\n'
    }
    prevParent = parent
    text += node.textContent
  }
  
  return text
}

function getBlockParent(node) {
  const blockTags = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE']
  let current = node.parentElement
  while (current && current !== Editor.contentEl) {
    if (blockTags.includes(current.tagName)) return current
    current = current.parentElement
  }
  return null
}

// ============================================
// ANALYSIS
// ============================================

function analyzeText(text) {
  const results = {
    adverbs: [],
    filter: [],
    passive: [],
    cliche: [],
    repetition: [],
    similarMeaning: [],
    longSentence: [],
    readability: null,
    wordCount: 0,
    sentenceCount: 0,
    avgSentenceLength: 0,
  }
  
  const words = text.trim().split(/\s+/).filter(w => w.length > 0)
  results.wordCount = words.length
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0)
  
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
  results.sentenceCount = sentences.length
  results.avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
  
  // ==================== CLICHÉS FIRST (mark their ranges so we don't double-flag words inside) ====================
  const clicheRanges = []
  CLICHES.forEach(cliche => {
    const escaped = cliche.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi')
    let match
    while ((match = regex.exec(text)) !== null) {
      results.cliche.push({
        text: match[0],
        start: match.index,
        end: match.index + match[0].length,
        word: cliche
      })
      clicheRanges.push({ start: match.index, end: match.index + match[0].length })
    }
  })
  
  function isInsideCliche(start, end) {
    return clicheRanges.some(r => start >= r.start && end <= r.end)
  }
  
  // ==================== ADVERBS ====================
  const adverbRegex = /\b([a-zA-Z']+ly)\b/g
  let match
  while ((match = adverbRegex.exec(text)) !== null) {
    const word = match[1].toLowerCase()
    if (word.length > 3 && !NON_ADVERB_LY.has(word)) {
      const start = match.index
      const end = start + match[1].length
      if (!isInsideCliche(start, end)) {
        results.adverbs.push({ text: match[1], start, end, word: match[1] })
      }
    }
  }
  
  // ==================== FILTER WORDS ====================
  const singleFilterRegex = new RegExp('\\b(' + Array.from(FILTER_WORDS_SINGLE).join('|') + ')\\b', 'gi')
  while ((match = singleFilterRegex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (!isInsideCliche(start, end)) {
      results.filter.push({ text: match[0], start, end, word: match[0] })
    }
  }
  
  FILTER_PHRASES.forEach(phrase => {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+')
    const regex = new RegExp('\\b' + escaped + '\\b', 'gi')
    while ((match = regex.exec(text)) !== null) {
      const start = match.index
      const end = start + match[0].length
      if (!isInsideCliche(start, end)) {
        results.filter.push({ text: match[0], start, end, word: match[0] })
      }
    }
  })
  
  // ==================== PASSIVE VOICE ====================
  const passiveRegex = /\b(is|was|were|are|be|been|being|am)\s+([a-z]+ed|written|spoken|known|seen|taken|given|driven|eaten|drawn|thrown|worn|born|torn|broken|chosen|frozen|stolen|held|told|sold|felt|kept|left|met|paid|said|sent|set|shot|shut|slept|swept|thought|understood|won|got|forgotten|beaten|hit|hurt|lent|lost|made|meant|put|quit|shone|shrunk|sung|sunk|struck|swum|taught|wound|found|bought|brought|caught|fought)\b/gi
  while ((match = passiveRegex.exec(text)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (!isInsideCliche(start, end)) {
      results.passive.push({ text: match[0], start, end, word: match[0] })
    }
  }
  
  // ==================== WORD REPETITION (NEW LOGIC!) ====================
  // Rules:
  //   1. Word must appear 3+ times in the whole text OR 2+ times within 25 words of each other
  //   2. Word must be at least 4 characters
  //   3. Word must NOT be a common word (from REPETITION_EXCLUDES)
  //   4. Word must NOT be a proper noun (capitalized in middle of sentence — likely a name)
  //   5. Don't flag words inside clichés (they're already flagged)
  
  const wordPositions = []
  const wordRegex2 = /\b[a-zA-Z']+\b/g
  while ((match = wordRegex2.exec(text)) !== null) {
    const original = match[0]
    const lower = original.toLowerCase()
    const clean = lower.replace(/[^a-z']/g, '')
    
    if (clean.length < 4) continue
    if (REPETITION_EXCLUDES.has(clean)) continue
    if (REPETITION_EXCLUDES.has(lower)) continue
    if (isInsideCliche(match.index, match.index + original.length)) continue
    
    // Check if it looks like a proper noun (capitalized, not at start of sentence)
    if (isProperNoun(original, match.index, text)) continue
    
    wordPositions.push({
      text: original,
      start: match.index,
      end: match.index + original.length,
      word: clean
    })
  }
  
  // Group by word
  const wordGroups = {}
  wordPositions.forEach(wp => {
    if (!wordGroups[wp.word]) wordGroups[wp.word] = []
    wordGroups[wp.word].push(wp)
  })
  
  // Find groups that qualify as repetition
  Analysis.repetitionGroups = []
  Object.keys(wordGroups).forEach(word => {
    const occurrences = wordGroups[word]
    
    let shouldFlag = false
    
    // Rule A: 3+ occurrences anywhere = definitely repetition
    if (occurrences.length >= 3) {
      shouldFlag = true
    }
    // Rule B: 2 occurrences within close proximity (25 words = ~150 chars)
    else if (occurrences.length === 2) {
      // Count words between them
      const between = text.substring(occurrences[0].end, occurrences[1].start)
      const wordsBetween = between.trim().split(/\s+/).filter(w => w.length > 0).length
      if (wordsBetween <= 25) {
        shouldFlag = true
      }
    }
    
    if (shouldFlag) {
      Analysis.repetitionGroups.push({
        word: word,
        count: occurrences.length
      })
      occurrences.forEach(occ => {
        results.repetition.push({
          text: occ.text,
          start: occ.start,
          end: occ.end,
          word: word
        })
      })
    }
  })
  
  // Sort repetition groups by count desc
  Analysis.repetitionGroups.sort((a, b) => b.count - a.count)
  
  // ==================== SIMILAR-MEANING ADVERBS ====================
  const adverbsWithGroups = results.adverbs.map(a => ({
    ...a,
    group: findAdverbGroup(a.word.toLowerCase())
  }))
  
  const smAdded = new Set()
  for (let i = 0; i < adverbsWithGroups.length; i++) {
    if (!adverbsWithGroups[i].group) continue
    for (let j = i + 1; j < adverbsWithGroups.length; j++) {
      if (!adverbsWithGroups[j].group) continue
      if (adverbsWithGroups[i].group === adverbsWithGroups[j].group &&
          adverbsWithGroups[j].start - adverbsWithGroups[i].end < 300) {
        [i, j].forEach(idx => {
          const key = `${adverbsWithGroups[idx].start}-${adverbsWithGroups[idx].end}`
          if (!smAdded.has(key)) {
            smAdded.add(key)
            results.similarMeaning.push({
              text: adverbsWithGroups[idx].text,
              start: adverbsWithGroups[idx].start,
              end: adverbsWithGroups[idx].end,
              word: adverbsWithGroups[idx].word
            })
          }
        })
        break
      }
    }
  }
  
  // ==================== LONG SENTENCES ====================
  const sentenceRegex = /[^.!?]+[.!?]+/g
  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentenceText = match[0]
    const sWords = sentenceText.trim().split(/\s+/).filter(w => w.length > 0).length
    if (sWords > 30) {
      results.longSentence.push({
        text: sentenceText.trim(),
        start: match.index,
        end: match.index + match[0].length,
        word: `${sWords} words`
      })
    }
  }
  
  // ==================== READABILITY ====================
  if (results.sentenceCount > 0 && results.wordCount > 0) {
    const wordsPerSentence = results.wordCount / results.sentenceCount
    const syllablesPerWord = totalSyllables / results.wordCount
    const flesch = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord)
    results.readability = {
      score: Math.max(0, Math.min(100, flesch)),
      wordsPerSentence,
      syllablesPerWord,
    }
  }
  
  return results
}

// Check if a word is likely a proper noun (name, place, etc.)
function isProperNoun(word, position, text) {
  // Not capitalized = not a proper noun
  if (word[0] !== word[0].toUpperCase() || word[0] === word[0].toLowerCase()) return false
  
  // Check what's before it — if it's the start of a sentence, we can't tell
  // Look back for the previous non-whitespace character
  let i = position - 1
  while (i >= 0 && /\s/.test(text[i])) i--
  
  // Start of text = could be either, assume not proper noun
  if (i < 0) return false
  
  // If preceded by sentence-ending punctuation, it might be sentence start
  const prevChar = text[i]
  if (prevChar === '.' || prevChar === '!' || prevChar === '?') {
    // Could be a sentence start, so we can't tell. Assume not proper noun to be safe.
    return false
  }
  
  // Capitalized in the middle of a sentence = likely a proper noun
  return true
}

function findAdverbGroup(word) {
  for (const [group, words] of Object.entries(ADVERB_GROUPS)) {
    if (words.includes(word)) return group
  }
  return null
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '')
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? matches.length : 1
}

// ============================================
// RENDER
// ============================================

function renderReadability(readability) {
  if (!readability) return
  
  const scoreEl = document.getElementById('readability-score')
  const labelEl = document.getElementById('readability-label')
  const fillEl = document.getElementById('readability-fill')
  const descEl = document.getElementById('readability-desc')
  const gradeEl = document.getElementById('readability-grade')
  
  const score = Math.round(readability.score)
  scoreEl.textContent = score
  fillEl.style.width = `${score}%`
  
  let label, grade, desc
  if (score >= 90) { label = 'Very Easy'; grade = '5th grade'; desc = 'Easily understood by an 11-year-old' }
  else if (score >= 80) { label = 'Easy'; grade = '6th grade'; desc = 'Conversational English for consumers' }
  else if (score >= 70) { label = 'Fairly Easy'; grade = '7th grade'; desc = 'Fairly easy to read' }
  else if (score >= 60) { label = 'Standard'; grade = '8-9th grade'; desc = 'Plain English, easily understood' }
  else if (score >= 50) { label = 'Fairly Difficult'; grade = '10-12th grade'; desc = 'Fairly difficult reading' }
  else if (score >= 30) { label = 'Difficult'; grade = 'College'; desc = 'Best for college-level readers' }
  else { label = 'Very Difficult'; grade = 'Graduate'; desc = 'Best understood by university graduates' }
  
  labelEl.textContent = label
  descEl.textContent = desc
  gradeEl.textContent = `📚 ${grade} reading level`
  gradeEl.style.display = 'inline-block'
}

function renderStats(results) {
  const stats = document.getElementById('analysis-stats')
  const totalIssues = results.adverbs.length + results.filter.length + results.passive.length + 
                       results.cliche.length + results.repetition.length + results.longSentence.length
  
  stats.innerHTML = `
    <div class="analysis-stat">
      <div class="analysis-stat-value">${formatNumber(results.wordCount)}</div>
      <div class="analysis-stat-label">Words</div>
    </div>
    <div class="analysis-stat">
      <div class="analysis-stat-value">${formatNumber(results.sentenceCount)}</div>
      <div class="analysis-stat-label">Sentences</div>
    </div>
    <div class="analysis-stat">
      <div class="analysis-stat-value">${results.avgSentenceLength.toFixed(1)}</div>
      <div class="analysis-stat-label">Avg Sentence Length</div>
    </div>
    <div class="analysis-stat">
      <div class="analysis-stat-value">${totalIssues}</div>
      <div class="analysis-stat-label">Total Issues</div>
    </div>
  `
}

// ============================================
// HIGHLIGHTING
// ============================================

function clearHighlights() {
  if (!Editor.contentEl) return
  
  Editor.contentEl.querySelectorAll('.prose-highlight').forEach(span => {
    const parent = span.parentNode
    while (span.firstChild) {
      parent.insertBefore(span.firstChild, span)
    }
    parent.removeChild(span)
  })
  
  Editor.contentEl.normalize()
}

function applyHighlights() {
  if (!Editor.contentEl || !Analysis.lastResults) return
  
  const selection = window.getSelection()
  let savedOffset = null
  if (selection.rangeCount > 0 && Editor.contentEl.contains(selection.anchorNode)) {
    savedOffset = getTextOffsetInEditor(selection.anchorNode, selection.anchorOffset)
  }
  
  clearHighlights()
  
  // Separate long sentences (they get a different treatment) from the rest
  const longSentenceHighlights = []
  const otherHighlights = []
  
  Object.keys(Analysis.enabledCategories).forEach(cat => {
    if (Analysis.enabledCategories[cat] && Analysis.lastResults[cat]) {
      Analysis.lastResults[cat].forEach(h => {
        const item = { ...h, category: cat }
        if (cat === 'longSentence') {
          longSentenceHighlights.push(item)
        } else {
          otherHighlights.push(item)
        }
      })
    }
  })
  
  // Apply long sentences FIRST (as bigger wrappers)
  const sortedLongDesc = [...longSentenceHighlights].sort((a, b) => b.start - a.start)
  for (const h of sortedLongDesc) {
    highlightRangeInEditor(h)
  }
  
  // Now apply other highlights ON TOP (they will fit inside long sentence spans)
  // Sort other highlights by position, handle overlaps
  otherHighlights.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  
  const nonOverlapping = []
  let lastEnd = -1
  for (const h of otherHighlights) {
    if (h.start >= lastEnd) {
      nonOverlapping.push(h)
      lastEnd = h.end
    }
  }
  
  const sortedOtherDesc = [...nonOverlapping].sort((a, b) => b.start - a.start)
  for (const h of sortedOtherDesc) {
    highlightRangeInEditor(h)
  }
  
  if (savedOffset !== null) {
    try { restoreTextOffset(savedOffset) } catch (e) {}
  }
}

function highlightRangeInEditor(highlight) {
  const { start, end, category, word } = highlight
  
  const walker = document.createTreeWalker(Editor.contentEl, NodeFilter.SHOW_TEXT, null, false)
  let currentPos = 0
  let node
  let prevBlockParent = null
  
  let startNode = null, startOffset = 0
  let endNode = null, endOffset = 0
  
  while (node = walker.nextNode()) {
    const blockParent = getBlockParent(node)
    if (blockParent && blockParent !== prevBlockParent && prevBlockParent !== null) {
      currentPos += 1
    }
    prevBlockParent = blockParent
    
    const nodeLen = node.textContent.length
    const nodeStart = currentPos
    const nodeEnd = currentPos + nodeLen
    
    if (startNode === null && start >= nodeStart && start < nodeEnd) {
      startNode = node
      startOffset = start - nodeStart
    }
    
    if (endNode === null && end > nodeStart && end <= nodeEnd) {
      endNode = node
      endOffset = end - nodeStart
      break
    }
    
    currentPos = nodeEnd
  }
  
  if (!startNode || !endNode) return
  
  try {
    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    
    const span = document.createElement('span')
    span.className = `prose-highlight type-${category}`
    const label = category === 'repetition' 
      ? `Repeated word: "${word}"`
      : category === 'longSentence'
      ? `Long sentence: ${word}`
      : `${CATEGORY_INFO[category].name}: ${word}`
    span.setAttribute('title', label)
    
    try {
      range.surroundContents(span)
    } catch (e) {
      try {
        const contents = range.extractContents()
        span.appendChild(contents)
        range.insertNode(span)
      } catch (e2) {}
    }
  } catch (e) {}
}

function getTextOffsetInEditor(node, offset) {
  const walker = document.createTreeWalker(Editor.contentEl, NodeFilter.SHOW_TEXT, null, false)
  let currentPos = 0
  let n
  let prevBlockParent = null
  
  while (n = walker.nextNode()) {
    const blockParent = getBlockParent(n)
    if (blockParent && blockParent !== prevBlockParent && prevBlockParent !== null) {
      currentPos += 1
    }
    prevBlockParent = blockParent
    
    if (n === node) return currentPos + offset
    currentPos += n.textContent.length
  }
  return currentPos
}

function restoreTextOffset(offset) {
  const walker = document.createTreeWalker(Editor.contentEl, NodeFilter.SHOW_TEXT, null, false)
  let currentPos = 0
  let n
  let prevBlockParent = null
  
  while (n = walker.nextNode()) {
    const blockParent = getBlockParent(n)
    if (blockParent && blockParent !== prevBlockParent && prevBlockParent !== null) {
      currentPos += 1
    }
    prevBlockParent = blockParent
    
    const nodeLen = n.textContent.length
    if (currentPos + nodeLen >= offset) {
      const range = document.createRange()
      range.setStart(n, Math.min(offset - currentPos, nodeLen))
      range.collapse(true)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
      return
    }
    currentPos += nodeLen
  }
}