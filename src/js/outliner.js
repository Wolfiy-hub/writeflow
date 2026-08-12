// outliner.js
// Story outliner with preset templates + custom sections

const Outliner = {
    currentOutline: null,
    saveTimer: null,
    titleSaveTimer: null,
    outlineToDelete: null,
    sectionToDelete: null,
    draggedCardId: null,
    draggedSectionId: null,
}

// ============================================
// TEMPLATES (with expanded, detailed descriptions)
// ============================================

const OUTLINE_TEMPLATES = [
    {
        id: 'three-act',
        icon: '🎭',
        name: 'Three-Act Structure',
        description: 'The classic dramatic structure used in most novels and films',
        beats: '9 beats',
        sections: [
            {
                name: 'Act I: Setup',
                cards: [
                    {
                        title: 'Hook',
                        placeholder: 'Grab your reader immediately. Open with something intriguing — a striking image, a mysterious question, an unusual situation, or a moment of tension. Your job is to promise the reader that this story is worth their time. Introduce your protagonist in their natural element, but make sure the very first paragraph makes them want to keep reading. Consider: What single scene or moment perfectly captures the tone of your story?'
                    },
                    {
                        title: 'Inciting Incident',
                        placeholder: 'The event that shatters your protagonist\'s status quo and kicks off the story. Before this, they were living their normal life; after this, nothing will be the same. This should happen relatively early — usually in the first 10-15% of the story. It doesn\'t have to be huge, but it must be personal to your protagonist and force them to react. Ask yourself: What single event would flip my protagonist\'s world upside down? Why does it matter specifically to THEM?'
                    },
                    {
                        title: 'Plot Point 1 (End of Act I)',
                        placeholder: 'The point of no return. Your protagonist has been thinking, resisting, or debating what to do about the inciting incident. Now they make a choice — or have one forced upon them — that commits them fully to the journey. This is where they leave the "ordinary world" behind. From this moment forward, they cannot go back to how things were. What decision or event locks them into the main story?'
                    }
                ]
            },
            {
                name: 'Act II: Confrontation',
                cards: [
                    {
                        title: 'Rising Action',
                        placeholder: 'The bulk of your story. Your protagonist pursues their goal, but obstacles pile up. Introduce new characters, complications, and subplots. Deepen relationships. Reveal information gradually. Each challenge should be harder than the last, and each should force your protagonist to grow, adapt, or reveal more of themselves. Keep asking: What could possibly go wrong? Then make it happen. Show your protagonist trying and failing, learning what does and doesn\'t work.'
                    },
                    {
                        title: 'Midpoint',
                        placeholder: 'A major turning point right in the middle of your story. Something huge shifts here — a revelation, a false victory, a devastating betrayal, or a change in the stakes. Your protagonist might discover the true nature of the antagonist, gain a new ally, or realize their original goal isn\'t what they truly need. After the midpoint, the story\'s trajectory changes. What single event would fundamentally alter your protagonist\'s understanding of what\'s happening?'
                    },
                    {
                        title: 'Plot Point 2 (End of Act II)',
                        placeholder: 'The darkest moment. All is lost. Your protagonist has suffered their worst setback yet — a huge defeat, a betrayal, the death of a mentor, or the loss of something precious. They may want to give up. This is the low point that makes their eventual triumph meaningful. Ask yourself: What would completely break my protagonist? What loss would force them to dig deeper than they ever have before?'
                    }
                ]
            },
            {
                name: 'Act III: Resolution',
                cards: [
                    {
                        title: 'Climax',
                        placeholder: 'The final confrontation. Everything has led to this. Your protagonist, changed by everything they\'ve been through, faces the main conflict head-on. This should be the biggest, most intense scene in your story. Stakes are at their highest. The outcome should feel both surprising and inevitable. What is the ultimate test your protagonist must face? How do they use what they\'ve learned throughout the story?'
                    },
                    {
                        title: 'Falling Action',
                        placeholder: 'The immediate aftermath of the climax. The dust settles. Loose ends begin to tie up. Characters process what just happened. This section is short but important — it lets your reader breathe after the intensity of the climax. Show the immediate consequences of the climax on the characters and their world.'
                    },
                    {
                        title: 'Resolution / Denouement',
                        placeholder: 'The new normal. Where are your characters now? How have they changed? Show the transformed world. This is your final promise to the reader — they invested time in this story, so give them satisfying closure. It doesn\'t have to be happy, but it should feel earned. What does your protagonist\'s life look like now? What lesson or theme should the reader walk away with?'
                    }
                ]
            }
        ]
    },
    {
        id: 'heros-journey',
        icon: '🗡️',
        name: "Hero's Journey",
        description: "Joseph Campbell's monomyth — 12 stages of a hero's transformation",
        beats: '12 beats',
        sections: [
            {
                name: 'Departure',
                cards: [
                    {
                        title: 'Ordinary World',
                        placeholder: 'Establish who your hero is, what their world looks like, and what makes their life feel "normal" to them. Show their routines, relationships, strengths, and hidden desires. Give the reader something to compare against — because everything is about to change. What\'s missing from their life? What are they secretly craving? Even small hints here will pay off later.'
                    },
                    {
                        title: 'Call to Adventure',
                        placeholder: 'Something disrupts your hero\'s ordinary world — a mysterious message, a stranger arrives, a disaster strikes, or an opportunity presents itself. This is their invitation to leave the familiar and enter the unknown. The call is often external at first, but it echoes something internal they\'ve been longing for or avoiding. What event or discovery would force your hero to consider a journey they\'d never planned?'
                    },
                    {
                        title: 'Refusal of the Call',
                        placeholder: 'Your hero hesitates. They doubt themselves, fear the unknown, or feel obligated to their current life. This resistance makes them human and relatable. They come up with excuses or try to ignore the call. This stage shows what they have to lose — and why the eventual acceptance costs them something. What fears or responsibilities are holding your hero back?'
                    },
                    {
                        title: 'Meeting the Mentor',
                        placeholder: 'A wise figure enters your hero\'s life — someone who has knowledge, wisdom, or magical gifts to help them on their journey. The mentor gives training, advice, or a special tool. This character represents the wisdom the hero needs to develop. Sometimes the mentor is a person; sometimes it\'s a book, a spirit, or a piece of technology. Who or what will guide your hero when they need it most?'
                    }
                ]
            },
            {
                name: 'Initiation',
                cards: [
                    {
                        title: 'Crossing the Threshold',
                        placeholder: 'Your hero commits. They step into the special world — literally or figuratively. This is the point of no return. The rules are different here. The stakes are higher. Everything they knew is now uncertain. This crossing should feel significant, even ceremonial. What visual or emotional marker separates the old world from the new?'
                    },
                    {
                        title: 'Tests, Allies, and Enemies',
                        placeholder: 'Your hero learns the rules of the new world by trial and error. They face small challenges that prepare them for larger ones. They meet potential allies who might join them and enemies who might oppose them. Loyalties are tested. Character is revealed under pressure. Who does your hero meet? Which relationships will matter later? What lessons must they learn to survive?'
                    },
                    {
                        title: 'Approach to the Inmost Cave',
                        placeholder: 'Your hero prepares for the major challenge ahead. This is a moment of gathering resources, making plans, or deepening resolve. Fear grows. The team may falter. The hero may reveal vulnerabilities. This is calm before the storm — the last chance to breathe before the biggest test. What preparation, doubt, or reflection happens right before the crucial moment?'
                    },
                    {
                        title: 'The Ordeal',
                        placeholder: 'The greatest challenge. Your hero confronts their deepest fear or most powerful enemy. They may seem to die — physically, emotionally, or symbolically. Everything is on the line. This is where the hero is truly tested and, through struggle, transformed. What single event would push your hero to their absolute limit and force them to become someone new?'
                    },
                    {
                        title: 'Reward (Seizing the Sword)',
                        placeholder: 'Your hero survives the ordeal and gains something significant — a treasure, knowledge, a weapon, love, or self-understanding. They celebrate the victory, but it\'s bittersweet. The real challenges may still lie ahead. What does your hero win? What new power, insight, or relationship do they now possess?'
                    }
                ]
            },
            {
                name: 'Return',
                cards: [
                    {
                        title: 'The Road Back',
                        placeholder: 'Your hero begins the journey home, but the adventure isn\'t over. Consequences of the ordeal catch up. Enemies may pursue them. New complications arise. The hero must recommit to returning to their ordinary world with what they\'ve gained. What obstacles arise on the way back? What temptations to stay or run away?'
                    },
                    {
                        title: 'Resurrection',
                        placeholder: 'The final test. Your hero faces one more challenge — bigger than the ordeal — that requires everything they\'ve learned. The stakes are cosmic: not just their own life, but the fate of others. Through this test, the hero is purified and reborn. They emerge as someone truly new. What final challenge proves they\'ve been permanently changed by the journey?'
                    },
                    {
                        title: 'Return with the Elixir',
                        placeholder: 'Your hero returns to the ordinary world, but they are no longer the same person. They bring back something valuable — wisdom, healing, treasure, or a new understanding — that can benefit their community or the world. The journey has meaning beyond themselves. What gift, insight, or change does your hero share with the world they left behind?'
                    }
                ]
            }
        ]
    },
    {
        id: 'save-the-cat',
        icon: '🐱',
        name: 'Save the Cat',
        description: 'Blake Snyder\'s 15-beat sheet — a modern screenwriting favorite',
        beats: '15 beats',
        sections: [
            {
                name: 'Act I',
                cards: [
                    {
                        title: 'Opening Image',
                        placeholder: 'A single snapshot that captures your story\'s tone, mood, and starting point. This is the "before" picture. It should visually contrast with the Final Image at the end. Show us your protagonist in their unchanged world. What image, if you had to pick just one, would perfectly represent the world your story begins in?'
                    },
                    {
                        title: 'Theme Stated',
                        placeholder: 'Someone — usually not the hero — says something that captures the theme or moral of your story. The hero often doesn\'t understand its meaning yet. It might sound like casual dialogue or advice, but it foreshadows what the hero must learn by the end. What single sentence sums up what your story is really about? Who would casually say it in a way the hero would dismiss?'
                    },
                    {
                        title: 'Set-up',
                        placeholder: 'Introduce your protagonist, their world, and everything that needs to change. Establish the hero\'s flaws, wants, and needs. Show relationships, environment, and daily life. Plant seeds that will grow later. This is your chance to make readers care before the story shifts. What does your hero need to lose, learn, or overcome by the end of the story?'
                    },
                    {
                        title: 'Catalyst',
                        placeholder: 'The inciting incident. Something happens TO your hero that they can\'t ignore. A knock at the door, a phone call, a revelation, a loss. This event punches the reset button on their life and sets the story in motion. What event forces your hero out of their comfort zone and into the main story?'
                    },
                    {
                        title: 'Debate',
                        placeholder: 'Your hero wrestles with what to do. They ask questions, resist, delay, or seek advice. This is the "should I or shouldn\'t I" phase. It shows what they\'re risking and what\'s holding them back. It also grounds the story emotionally before the big leap. What questions is your hero asking themselves? What fears are they wrestling with?'
                    },
                    {
                        title: 'Break into Two',
                        placeholder: 'The hero makes a proactive choice to leave the old world behind and enter the new one. This is the true beginning of the adventure. They\'re committing to change, even if they don\'t know what awaits. What choice does your hero make that puts them firmly on their journey?'
                    }
                ]
            },
            {
                name: 'Act II',
                cards: [
                    {
                        title: 'B Story',
                        placeholder: 'A secondary story or relationship begins — often a love interest, mentor, or sidekick. The B story exists to carry the theme, giving your hero space to learn the lesson they\'ll need for the climax. It contrasts with the main plot (A story) and gives emotional depth. What subplot or new relationship deepens your story\'s theme?'
                    },
                    {
                        title: 'Fun and Games',
                        placeholder: 'The "promise of the premise." This is what your reader came for — the concept in action. If your book is about a wizard school, this is where we see magical classes. If it\'s a heist story, this is where the crew gets together. Have fun with your concept. Show us what makes this story unique and entertaining.'
                    },
                    {
                        title: 'Midpoint',
                        placeholder: 'A false victory or false defeat. The stakes rise. Your hero either seems to be winning (but there\'s a hidden problem) or losing badly (but with a glimmer of hope). Either way, this is a turning point that shifts the story\'s energy. Fun and Games is over — things get serious now. What major event flips the story\'s emotional trajectory?'
                    },
                    {
                        title: 'Bad Guys Close In',
                        placeholder: 'External and internal pressures mount. Enemies grow more aggressive. Teammates fight or lose faith. The hero\'s own doubts and flaws create problems. Every wrong step has consequences. Things get progressively worse. What could go wrong — for your hero externally and internally?'
                    },
                    {
                        title: 'All is Lost',
                        placeholder: 'The absolute bottom. Something dies here — a person, a dream, a relationship, an identity. This is the worst possible outcome. Your hero has lost everything they thought they wanted. This moment must feel devastating and irrecoverable. What loss would utterly crush your hero?'
                    },
                    {
                        title: 'Dark Night of the Soul',
                        placeholder: 'Your hero wallows in defeat. They question everything. This is a moment of true darkness before the dawn. But somewhere in this despair, they find something — an insight, a memory, a spark of resolve. What thought or realization pulls your hero out of the abyss?'
                    },
                    {
                        title: 'Break into Three',
                        placeholder: 'Your hero has the answer. They\'ve learned the lesson (usually from the B story) and now know what they must do. They commit to a final plan. Momentum shifts. Hope returns. What insight or realization gives your hero the strength to fight back?'
                    }
                ]
            },
            {
                name: 'Act III',
                cards: [
                    {
                        title: 'Finale',
                        placeholder: 'The execution of the plan. Your hero gathers allies, storms the castle, confronts the antagonist, and wins the day. Everything they\'ve learned comes into play. Loose ends resolve. Justice or love or truth prevails. Make it satisfying, surprising, and earned. What does the climax look like? How does your hero use everything they\'ve learned?'
                    },
                    {
                        title: 'Final Image',
                        placeholder: 'The mirror of the Opening Image. If you started with your hero alone and unhappy, end with them surrounded by loved ones and content — or the opposite, showing a tragic loss. This image should visually demonstrate how much has changed. What single image proves that your hero — and their world — has transformed?'
                    }
                ]
            }
        ]
    },
    {
        id: 'seven-point',
        icon: '⚡',
        name: 'Seven-Point Story',
        description: 'Dan Wells\' streamlined structure for tight, focused stories',
        beats: '7 beats',
        sections: [
            {
                name: 'Structure',
                cards: [
                    {
                        title: 'Hook',
                        placeholder: 'Start your hero in the OPPOSITE state from where they\'ll end. If the story is about them becoming brave, start them cowardly. If it\'s about learning to love, start them isolated. The hook should immediately establish who your hero is at the start — and hint at who they need to become. What is the emotional starting state of your hero? What\'s the opposite of what they\'ll achieve?'
                    },
                    {
                        title: 'Plot Turn 1',
                        placeholder: 'The world changes. Something happens that thrusts your hero into the main conflict. This is the inciting incident — the "OK, now the story begins" moment. From here, the hero can\'t go back to their normal life. What event forces your hero to leave their old world and enter the story\'s central conflict?'
                    },
                    {
                        title: 'Pinch Point 1',
                        placeholder: 'Apply pressure. Show what the antagonist or opposing force is capable of. This is where the reader (and often the hero) gets a taste of what they\'re up against. Something threatening happens — a loss, a threat, a demonstration of the villain\'s power. Raise the stakes. What action from the antagonist proves the threat is real and dangerous?'
                    },
                    {
                        title: 'Midpoint',
                        placeholder: 'Your hero shifts from reacting to acting. Up until now, they\'ve been swept along by events. Now they take control, form a plan, and go on the offensive. This is the moment they stop being a victim and start being a hero. What decision or event pushes your hero from passive to active?'
                    },
                    {
                        title: 'Pinch Point 2',
                        placeholder: 'More pressure. Bigger stakes. Things get worse than before. Often a betrayal, a devastating loss, or the antagonist gaining a major advantage. Your hero\'s plan seems to be failing. This is where everything feels most hopeless. What is the biggest blow your hero suffers before the finale?'
                    },
                    {
                        title: 'Plot Turn 2',
                        placeholder: 'Your hero gets what they need for the final battle — the last key piece. This could be a weapon, information, an ally, a lesson learned, or a moment of clarity. Everything they\'ve been through now converges into their moment of strength. What final piece falls into place that enables the climax?'
                    },
                    {
                        title: 'Resolution',
                        placeholder: 'The climax and the aftermath. Your hero, now in the OPPOSITE state from where they started (see: Hook), succeeds. Whatever change you promised at the beginning is fulfilled. Show us the transformed hero and the new world they\'ve created. How does your hero demonstrate they\'ve become their opposite? What does the new normal look like?'
                    }
                ]
            }
        ]
    },
    {
        id: 'freytag',
        icon: '📐',
        name: "Freytag's Pyramid",
        description: 'Classical five-part dramatic structure',
        beats: '5 beats',
        sections: [
            {
                name: 'The Five Parts',
                cards: [
                    {
                        title: 'Exposition',
                        placeholder: 'Introduce the setting, main characters, and the initial situation. Set up the world, its rules, and the balance that\'s about to be broken. Establish tone, genre, and what\'s "normal" for your characters. Give the reader everything they need to invest in the story before conflict truly begins.'
                    },
                    {
                        title: 'Rising Action',
                        placeholder: 'Conflict enters and intensifies. Each scene raises the stakes and complicates matters further. Your protagonist faces obstacles, makes decisions, and pursues their goal. Tension builds steadily. Introduce complications and subplots. Every scene should push the story forward or reveal character.'
                    },
                    {
                        title: 'Climax',
                        placeholder: 'The turning point. The moment of highest tension and drama. Your protagonist faces their greatest challenge — the ultimate test. The outcome here determines everything that follows. Make it memorable, decisive, and emotionally powerful.'
                    },
                    {
                        title: 'Falling Action',
                        placeholder: 'The aftermath of the climax. The story\'s tension begins to ease. Consequences of the climax play out. Loose ends start to unwind. Characters process what happened. This is a chance to give the reader emotional breathing room after the intensity of the climax.'
                    },
                    {
                        title: 'Denouement',
                        placeholder: 'The final resolution. Everything reaches its conclusion. The final state of the characters and their world is revealed. Whether tragic or triumphant, this ending should feel inevitable — the natural result of everything that came before. Show us what has been gained, lost, and learned.'
                    }
                ]
            }
        ]
    },
    {
        id: 'story-circle',
        icon: '⭕',
        name: 'Story Circle',
        description: "Dan Harmon's 8-step circular structure (Rick and Morty)",
        beats: '8 beats',
        sections: [
            {
                name: 'The Circle',
                cards: [
                    {
                        title: '1. You (Comfort Zone)',
                        placeholder: 'Your protagonist in their familiar, comfortable world. This is their status quo — what they know and what they\'re good at. Show us this world so we understand what they have to lose (and what\'s missing). Introduce them in a moment that reveals their character, their flaws, and their environment.'
                    },
                    {
                        title: '2. Need',
                        placeholder: 'Something is missing. Your protagonist has a want, a desire, or an unmet need. It might be internal (loneliness, ambition, insecurity) or external (survival, freedom, love). Even in their comfort zone, they feel a pull toward something more. What are they secretly wishing for? What are they avoiding facing?'
                    },
                    {
                        title: '3. Go (Unfamiliar Situation)',
                        placeholder: 'Your protagonist enters an unfamiliar world or situation. They cross a threshold — leaving what they know and stepping into the unknown. This can be literal (a new place) or figurative (a new relationship, a new challenge, a new role). What event or decision takes them out of their comfort zone?'
                    },
                    {
                        title: '4. Search',
                        placeholder: 'Your protagonist struggles to adapt. They try, they fail, they learn. This is the trial-and-error phase. They meet allies and enemies, discover the rules of this new world, and slowly figure out how to survive here. Show them growing through challenges. What tests do they face? Who helps and who hinders?'
                    },
                    {
                        title: '5. Find',
                        placeholder: 'Your protagonist gets what they wanted. They achieve their goal, obtain the treasure, or reach the destination. But the moment of triumph is complicated — what they found isn\'t exactly what they expected. There\'s a catch, a cost, or a hidden truth. What does getting what they wanted actually look like?'
                    },
                    {
                        title: '6. Take (Pay the Price)',
                        placeholder: 'Getting what they wanted comes at a heavy cost. Something must be sacrificed — a relationship, an ideal, safety, innocence, or even a piece of who they were. This is where the story gets serious. The victory is bittersweet. What price does your protagonist pay for what they gained?'
                    },
                    {
                        title: '7. Return',
                        placeholder: 'Your protagonist journeys back to their familiar world. But they don\'t just walk back easily — they must fight or struggle to return, often facing pursuers or complications. The road back is dangerous but necessary. How do they navigate the return? What obstacles arise?'
                    },
                    {
                        title: '8. Change',
                        placeholder: 'Your protagonist is home, but they\'re not the same person who left. They\'ve been transformed by what they experienced. Their old comfort zone now looks different to them — they see it through new eyes. Show us the change. What do they now understand that they didn\'t before? How does their old world respond to their new self?'
                    }
                ]
            }
        ]
    },
    {
        id: 'blank',
        icon: '📝',
        name: 'Blank Outline',
        description: 'Start from scratch with a completely custom structure',
        beats: 'Custom',
        sections: [
            {
                name: 'My Story',
                cards: [
                    { title: 'Scene 1', placeholder: 'Describe what happens in this scene. Who is present? What is the setting? What conflict or event drives the scene? What changes by the end?' }
                ]
            }
        ]
    }
]

// ============================================
// INITIALIZATION
// ============================================

function initOutliner() {
    document.getElementById('btn-new-outline-empty').addEventListener('click', showTemplatePicker)
    document.getElementById('btn-delete-outline').addEventListener('click', () => {
        if (Outliner.currentOutline) openDeleteOutlineModal(Outliner.currentOutline.id)
    })
    document.getElementById('btn-confirm-delete-outline').addEventListener('click', confirmDeleteOutline)
    document.getElementById('btn-confirm-delete-section').addEventListener('click', confirmDeleteSection)

    document.getElementById('outliner-title-input').addEventListener('input', () => {
        if (!Outliner.currentOutline) return
        Outliner.currentOutline.name = document.getElementById('outliner-title-input').value.trim() || 'Untitled Outline'
        updateSidebarOutlineItem(Outliner.currentOutline)
        clearTimeout(Outliner.titleSaveTimer)
        Outliner.titleSaveTimer = setTimeout(saveOutlineData, 500)
    })
}

// ============================================
// TEMPLATE PICKER
// ============================================

function showTemplatePicker() {
    const grid = document.getElementById('template-grid')
    grid.innerHTML = OUTLINE_TEMPLATES.map(t => `
    <button class="template-card" data-template-id="${t.id}">
      <div class="template-card-icon">${t.icon}</div>
      <div class="template-card-name">${escapeHtml(t.name)}</div>
      <div class="template-card-desc">${escapeHtml(t.description)}</div>
      <div class="template-card-beats">${escapeHtml(t.beats)}</div>
    </button>
  `).join('')

    grid.querySelectorAll('.template-card').forEach(card => {
        card.addEventListener('click', () => {
            const templateId = card.dataset.templateId
            createOutlineFromTemplate(templateId)
        })
    })

    showModal('modal-outline-template')
}

async function createOutlineFromTemplate(templateId) {
    if (!AppState.currentProject) return

    const template = OUTLINE_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    const outline = {
        id: generateId(),
        templateId: template.id,
        templateName: template.name,
        templateIcon: template.icon,
        templateDescription: template.description,
        name: `${template.name} - Outline`,
        sections: template.sections.map(section => ({
            id: generateId(),
            name: section.name,
            cards: section.cards.map(card => ({
                id: generateId(),
                title: card.title,
                placeholder: card.placeholder,
                content: ''
            }))
        })),
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
    }

    if (!AppState.currentProject.outlines) AppState.currentProject.outlines = []
    AppState.currentProject.outlines.push(outline)

    await saveCurrentProject()
    hideModal('modal-outline-template')
    openOutline(outline)
    showToast(`${template.name} outline created`, 'success')
}

// ============================================
// VIEW MANAGEMENT
// ============================================

function showOutlinerView() {
    if (!AppState.currentProject) return

    const outlines = AppState.currentProject.outlines || []
    const empty = document.getElementById('outliner-empty')
    const active = document.getElementById('outliner-active')

    if (outlines.length === 0) {
        empty.classList.remove('hidden')
        active.classList.add('hidden')
        active.style.display = 'none'
        Outliner.currentOutline = null
    } else {
        const toOpen = Outliner.currentOutline
            ? outlines.find(o => o.id === Outliner.currentOutline.id) || outlines[0]
            : outlines[0]
        openOutline(toOpen)
    }
}

function openOutline(outline) {
    if (!outline) return

    Outliner.currentOutline = outline

    document.getElementById('outliner-empty').classList.add('hidden')
    document.getElementById('outliner-active').classList.remove('hidden')
    document.getElementById('outliner-active').style.display = 'flex'

    document.getElementById('outliner-title-input').value = outline.name || ''

    renderOutline()
    updateSidebarForOutliner(AppState.currentProject)
}

// ============================================
// RENDER
// ============================================

function renderOutline() {
    if (!Outliner.currentOutline) return

    const container = document.getElementById('outliner-content')
    const outline = Outliner.currentOutline

    let html = ''

    // Template info banner
    if (outline.templateId && outline.templateId !== 'blank') {
        html += `
      <div class="outliner-template-info">
        <div class="outliner-template-info-icon">${outline.templateIcon || '📋'}</div>
        <div class="outliner-template-info-text">
          <div class="outliner-template-info-title">${escapeHtml(outline.templateName)}</div>
          <div class="outliner-template-info-desc">${escapeHtml(outline.templateDescription || '')}</div>
        </div>
      </div>
    `
    }

    // Sections
    outline.sections.forEach((section, sectionIdx) => {
        html += `
      <div class="outliner-section" data-section-id="${section.id}" draggable="false">
        <div class="outliner-section-header">
          <div class="outliner-section-drag" title="Drag to reorder section">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="5" r="1.5"/>
              <circle cx="15" cy="5" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/>
              <circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="19" r="1.5"/>
              <circle cx="15" cy="19" r="1.5"/>
            </svg>
          </div>
          <span class="outliner-section-badge">Section ${sectionIdx + 1}</span>
          <input type="text" class="outliner-section-name-input" 
                 value="${escapeHtml(section.name)}" 
                 data-section-id="${section.id}"
                 placeholder="Section name..." />
          <span class="outliner-section-subtitle">${section.cards.length} card${section.cards.length !== 1 ? 's' : ''}</span>
          <div class="outliner-section-actions">
            <button class="outliner-section-action danger" data-action="delete-section" data-section-id="${section.id}" title="Delete section">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="outliner-cards">
    `

        section.cards.forEach((card, cardIdx) => {
            html += createCardHTML(card, cardIdx + 1, section.id)
        })

        html += `
        </div>
        <button class="outliner-add-card" data-section-id="${section.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Card
        </button>
      </div>
    `
    })

    // Add section button
    html += `
    <button class="outliner-add-section" id="btn-add-section">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      Add New Section
    </button>
  `

    container.innerHTML = html

    attachAllEventListeners()
}

function createCardHTML(card, number, sectionId) {
    return `
    <div class="outliner-card" data-card-id="${card.id}" data-section-id="${sectionId}" draggable="true">
      <div class="outliner-card-drag" title="Drag to reorder">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5"/>
          <circle cx="15" cy="5" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/>
          <circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="19" r="1.5"/>
          <circle cx="15" cy="19" r="1.5"/>
        </svg>
      </div>
      <div class="outliner-card-header">
        <span class="outliner-card-number">${number}</span>
        <input type="text" class="outliner-card-title-input" 
               value="${escapeHtml(card.title)}" 
               data-card-id="${card.id}"
               placeholder="Card title..." />
        <div class="outliner-card-actions">
          <button class="outliner-card-action danger" data-action="delete-card" data-card-id="${card.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
            </svg>
          </button>
        </div>
      </div>
      ${card.placeholder ? `<div class="outliner-card-placeholder">${escapeHtml(card.placeholder)}</div>` : ''}
      <div class="outliner-card-content">
        <textarea class="outliner-card-textarea" 
                  data-card-id="${card.id}"
                  placeholder="Start writing your notes for this beat...">${escapeHtml(card.content || '')}</textarea>
      </div>
    </div>
  `
}

function attachAllEventListeners() {
    // Section name inputs
    document.querySelectorAll('.outliner-section-name-input').forEach(input => {
        input.addEventListener('input', () => {
            const sectionId = input.dataset.sectionId
            const section = findSection(sectionId)
            if (section) {
                section.name = input.value.trim() || 'Untitled Section'
                scheduleOutlineSave()
            }
        })
        input.addEventListener('click', (e) => e.stopPropagation()) // prevent drag from triggering
    })

    // Delete section buttons
    document.querySelectorAll('[data-action="delete-section"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            const sectionId = btn.dataset.sectionId
            openDeleteSectionModal(sectionId)
        })
    })

    // Add section button
    document.getElementById('btn-add-section')?.addEventListener('click', addSection)

    // Card title inputs
    document.querySelectorAll('.outliner-card-title-input').forEach(input => {
        input.addEventListener('input', () => {
            const cardId = input.dataset.cardId
            const card = findCard(cardId)
            if (card) {
                card.title = input.value.trim() || 'Untitled Card'
                scheduleOutlineSave()
            }
        })
    })

    // Card textareas
    document.querySelectorAll('.outliner-card-textarea').forEach(textarea => {
        textarea.addEventListener('input', () => {
            const cardId = textarea.dataset.cardId
            const card = findCard(cardId)
            if (card) {
                card.content = textarea.value
                scheduleOutlineSave()
            }
        })

        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto'
            textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px'
        })

        setTimeout(() => {
            textarea.style.height = 'auto'
            textarea.style.height = Math.max(60, textarea.scrollHeight) + 'px'
        }, 0)
    })

    // Delete card buttons
    document.querySelectorAll('[data-action="delete-card"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation()
            const cardId = btn.dataset.cardId
            if (confirm('Delete this card?')) {
                deleteCard(cardId)
            }
        })
    })

    // Add card buttons
    document.querySelectorAll('.outliner-add-card').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.sectionId
            addCard(sectionId)
        })
    })

    // Card drag & drop
    document.querySelectorAll('.outliner-card').forEach(card => {
        card.addEventListener('dragstart', handleCardDragStart)
        card.addEventListener('dragend', handleCardDragEnd)
        card.addEventListener('dragover', handleCardDragOver)
        card.addEventListener('drop', handleCardDrop)
        card.addEventListener('dragleave', handleCardDragLeave)
    })

    // Section drag & drop - only initiate drag from the drag handle
    document.querySelectorAll('.outliner-section').forEach(section => {
        // Sections aren't draggable by default
        section.setAttribute('draggable', 'false')

        // Enable draggable when mousing down on the drag handle
        const dragHandle = section.querySelector('.outliner-section-drag')
        if (dragHandle) {
            dragHandle.addEventListener('mousedown', () => {
                section.setAttribute('draggable', 'true')
            })
            dragHandle.addEventListener('mouseup', () => {
                section.setAttribute('draggable', 'false')
            })
        }

        section.addEventListener('dragstart', handleSectionDragStart)
        section.addEventListener('dragend', (e) => {
            handleSectionDragEnd(e)
            section.setAttribute('draggable', 'false')
        })
        section.addEventListener('dragover', handleSectionDragOver)
        section.addEventListener('drop', handleSectionDrop)
        section.addEventListener('dragleave', handleSectionDragLeave)
    })
}

// ============================================
// FINDERS
// ============================================

function findCard(cardId) {
    if (!Outliner.currentOutline) return null
    for (const section of Outliner.currentOutline.sections) {
        const card = section.cards.find(c => c.id === cardId)
        if (card) return card
    }
    return null
}

function findSection(sectionId) {
    if (!Outliner.currentOutline) return null
    return Outliner.currentOutline.sections.find(s => s.id === sectionId)
}

// ============================================
// CARD MANAGEMENT
// ============================================

async function addCard(sectionId) {
    if (!Outliner.currentOutline) return
    const section = findSection(sectionId)
    if (!section) return

    const card = {
        id: generateId(),
        title: 'New Card',
        placeholder: '',
        content: ''
    }

    section.cards.push(card)
    await saveOutlineData()
    renderOutline()

    setTimeout(() => {
        const input = document.querySelector(`.outliner-card-title-input[data-card-id="${card.id}"]`)
        if (input) {
            input.focus()
            input.select()
        }
    }, 50)
}

async function deleteCard(cardId) {
    if (!Outliner.currentOutline) return

    for (const section of Outliner.currentOutline.sections) {
        const idx = section.cards.findIndex(c => c.id === cardId)
        if (idx !== -1) {
            section.cards.splice(idx, 1)
            await saveOutlineData()
            renderOutline()
            showToast('Card deleted', 'info')
            return
        }
    }
}

// ============================================
// SECTION MANAGEMENT
// ============================================

async function addSection() {
    if (!Outliner.currentOutline) return

    const section = {
        id: generateId(),
        name: `New Section`,
        cards: [
            {
                id: generateId(),
                title: 'New Card',
                placeholder: '',
                content: ''
            }
        ]
    }

    Outliner.currentOutline.sections.push(section)
    await saveOutlineData()
    renderOutline()
    showToast('Section added', 'success')

    // Focus the new section name input
    setTimeout(() => {
        const input = document.querySelector(`.outliner-section-name-input[data-section-id="${section.id}"]`)
        if (input) {
            input.focus()
            input.select()
        }
    }, 50)
}

function openDeleteSectionModal(sectionId) {
    const section = findSection(sectionId)
    if (!section) return

    Outliner.sectionToDelete = sectionId
    document.getElementById('delete-section-name').textContent = section.name || 'Untitled Section'
    showModal('modal-delete-section')
}

async function confirmDeleteSection() {
    if (!Outliner.sectionToDelete || !Outliner.currentOutline) return

    // Don't delete last section
    if (Outliner.currentOutline.sections.length <= 1) {
        showToast('You must have at least one section', 'error')
        hideModal('modal-delete-section')
        return
    }

    Outliner.currentOutline.sections = Outliner.currentOutline.sections.filter(
        s => s.id !== Outliner.sectionToDelete
    )

    await saveOutlineData()
    hideModal('modal-delete-section')
    renderOutline()
    showToast('Section deleted', 'info')
    Outliner.sectionToDelete = null
}

// ============================================
// CARD DRAG & DROP
// ============================================

function handleCardDragStart(e) {
    // Only if the drag started from a card's drag handle
    if (!e.target.closest('.outliner-card-drag')) {
        // Also allow dragging from anywhere else on the card except section drag handle
        if (e.target.closest('.outliner-section-drag')) return
    }

    const card = e.currentTarget
    Outliner.draggedCardId = card.dataset.cardId
    card.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'card:' + Outliner.draggedCardId)
    e.stopPropagation()
}

function handleCardDragEnd(e) {
    e.currentTarget.classList.remove('dragging')
    document.querySelectorAll('.outliner-card').forEach(c => c.classList.remove('drag-over'))
    Outliner.draggedCardId = null
}

function handleCardDragOver(e) {
    if (!Outliner.draggedCardId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const card = e.currentTarget
    if (card.dataset.cardId === Outliner.draggedCardId) return

    document.querySelectorAll('.outliner-card').forEach(c => c.classList.remove('drag-over'))
    card.classList.add('drag-over')
}

function handleCardDragLeave(e) {
    const card = e.currentTarget
    if (!card.contains(e.relatedTarget)) {
        card.classList.remove('drag-over')
    }
}

async function handleCardDrop(e) {
    if (!Outliner.draggedCardId) return
    e.preventDefault()
    e.stopPropagation()

    const targetCard = e.currentTarget
    const targetId = targetCard.dataset.cardId
    const sourceId = Outliner.draggedCardId

    if (!sourceId || sourceId === targetId) return

    let sourceCard = null
    let sourceSection = null
    for (const section of Outliner.currentOutline.sections) {
        const idx = section.cards.findIndex(c => c.id === sourceId)
        if (idx !== -1) {
            sourceCard = section.cards.splice(idx, 1)[0]
            sourceSection = section
            break
        }
    }

    if (!sourceCard) return

    let targetSection = null
    let targetIdx = -1
    for (const section of Outliner.currentOutline.sections) {
        const idx = section.cards.findIndex(c => c.id === targetId)
        if (idx !== -1) {
            targetSection = section
            targetIdx = idx
            break
        }
    }

    if (targetSection) {
        targetSection.cards.splice(targetIdx, 0, sourceCard)
    } else if (sourceSection) {
        sourceSection.cards.push(sourceCard)
    }

    await saveOutlineData()
    renderOutline()
}

// ============================================
// SECTION DRAG & DROP
// ============================================

function handleSectionDragStart(e) {
    const section = e.currentTarget
    Outliner.draggedSectionId = section.dataset.sectionId
    section.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', 'section:' + Outliner.draggedSectionId)
}

function handleSectionDragEnd(e) {
    e.currentTarget.classList.remove('dragging')
    document.querySelectorAll('.outliner-section').forEach(s => s.classList.remove('drag-over-section'))
    Outliner.draggedSectionId = null
}

function handleSectionDragOver(e) {
    if (!Outliner.draggedSectionId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    const section = e.currentTarget
    if (section.dataset.sectionId === Outliner.draggedSectionId) return

    document.querySelectorAll('.outliner-section').forEach(s => s.classList.remove('drag-over-section'))
    section.classList.add('drag-over-section')
}

function handleSectionDragLeave(e) {
    const section = e.currentTarget
    if (!section.contains(e.relatedTarget)) {
        section.classList.remove('drag-over-section')
    }
}

async function handleSectionDrop(e) {
    if (!Outliner.draggedSectionId) return
    e.preventDefault()

    const targetSection = e.currentTarget
    const targetId = targetSection.dataset.sectionId
    const sourceId = Outliner.draggedSectionId

    if (!sourceId || sourceId === targetId) return

    const sections = Outliner.currentOutline.sections
    const sourceIdx = sections.findIndex(s => s.id === sourceId)
    const targetIdx = sections.findIndex(s => s.id === targetId)

    if (sourceIdx === -1 || targetIdx === -1) return

    const [movedSection] = sections.splice(sourceIdx, 1)
    const newTargetIdx = sections.findIndex(s => s.id === targetId)
    sections.splice(newTargetIdx, 0, movedSection)

    await saveOutlineData()
    renderOutline()
}

// ============================================
// DELETE OUTLINE
// ============================================

function openDeleteOutlineModal(outlineId) {
    const outline = AppState.currentProject?.outlines?.find(o => o.id === outlineId)
    if (!outline) return

    Outliner.outlineToDelete = outlineId
    document.getElementById('delete-outline-name').textContent = outline.name || 'Untitled Outline'
    showModal('modal-delete-outline')
}

async function confirmDeleteOutline() {
    if (!Outliner.outlineToDelete || !AppState.currentProject) return

    AppState.currentProject.outlines = AppState.currentProject.outlines.filter(
        o => o.id !== Outliner.outlineToDelete
    )

    const wasCurrent = Outliner.currentOutline?.id === Outliner.outlineToDelete

    await saveCurrentProject()
    hideModal('modal-delete-outline')
    showToast('Outline deleted', 'success')

    if (wasCurrent) {
        Outliner.currentOutline = null
        showOutlinerView()
    }

    updateSidebarForOutliner(AppState.currentProject)
    Outliner.outlineToDelete = null
}

// ============================================
// SAVE
// ============================================

function scheduleOutlineSave() {
    clearTimeout(Outliner.saveTimer)
    Outliner.saveTimer = setTimeout(saveOutlineData, 800)
}

async function saveOutlineData() {
    if (!Outliner.currentOutline || !AppState.currentProject) return
    Outliner.currentOutline.lastModified = new Date().toISOString()
    await saveCurrentProject()
}

// ============================================
// SIDEBAR
// ============================================

function updateSidebarForOutliner(project) {
    const content = document.getElementById('sidebar-content')
    const outlines = project.outlines || []

    content.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-section-header">
        <span>Outlines</span>
        <button class="sidebar-add-btn" id="btn-sidebar-add-outline" data-tooltip="New Outline">+</button>
      </div>
      <div>
        ${outlines.length === 0
            ? '<p class="sidebar-empty">No outlines yet.<br>Click + to add one.</p>'
            : outlines.map(o => createSidebarOutlineItem(o)).join('')
        }
      </div>
    </div>
  `

    document.getElementById('btn-sidebar-add-outline')?.addEventListener('click', showTemplatePicker)

    document.querySelectorAll('.outliner-sidebar-item').forEach(item => {
        item.addEventListener('click', () => {
            const outlineId = item.dataset.outlineId
            const outline = AppState.currentProject.outlines.find(o => o.id === outlineId)
            if (outline) openOutline(outline)
        })
    })
}

function createSidebarOutlineItem(outline) {
    const isActive = Outliner.currentOutline?.id === outline.id
    const cardCount = outline.sections.reduce((sum, s) => sum + s.cards.length, 0)

    return `
    <div class="outliner-sidebar-item ${isActive ? 'active' : ''}" data-outline-id="${outline.id}">
      <div class="outliner-sidebar-icon">${outline.templateIcon || '📋'}</div>
      <div class="outliner-sidebar-info">
        <span class="outliner-sidebar-name">${escapeHtml(outline.name || 'Untitled')}</span>
        <span class="outliner-sidebar-meta">${cardCount} card${cardCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `
}

function updateSidebarOutlineItem(outline) {
    const item = document.querySelector(`.outliner-sidebar-item[data-outline-id="${outline.id}"]`)
    if (!item) return

    const nameEl = item.querySelector('.outliner-sidebar-name')
    if (nameEl) nameEl.textContent = outline.name || 'Untitled'
}