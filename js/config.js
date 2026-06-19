/* ============================================================
 * config.js — Central Configuration
 * ============================================================
 * PURPOSE:
 *   Single source of truth for ALL customizable values.
 *   Change assets, text, colors, and timings here only.
 *   No other file should contain hardcoded paths or strings.
 *
 * CUSTOMIZATION:
 *   - Replace empty strings with paths to your assets.
 *   - Supported formats for backgrounds: .gif, .mp4, .jpg, .png, .webp
 *   - Supported formats for images: .png, .gif, .webp, .svg
 *   - Supported formats for audio: .mp3, .ogg, .wav (or leave empty for Web Audio synth)
 *
 * ASSET LOCATIONS:
 *   Place files in /assets/images/, /assets/gifs/, /assets/audio/, /assets/icons/
 * ============================================================ */

const CONFIG = {

  /* ---- GENERAL ---- */
  title: "OSDHACK'26",
  subtitle: "THE ARCADE HACKATHON",
  tagline: "CODE · BUILD · DEVOUR",

  /* ---- LOGO ----
   * Path to your event logo PNG/SVG.
   * Leave empty ("") and a styled text fallback will render.
   * Recommended: transparent PNG, 400–800px wide.
   * Example: "assets/images/logo.png"
   */
  logo: "assets/images/main.png",

  /* ---- MASCOT ----
   * Path to a floating mascot/character PNG.
   * It will float, rotate subtly, and have a shadow.
   * Example: "assets/images/pizza-mascot.png"
   */
  mascotImage: "",

  /* ---- BACKGROUNDS ----
   * Each screen supports: .gif, .mp4, .jpg, .png, .webp
   * The system auto-detects format from the file extension.
   * Leave empty ("") for the default CSS gradient background.
   *
   * Examples:
   *   "assets/gifs/pizzeria.gif"
   *   "assets/images/arcade-room.jpg"
   *   "assets/gifs/retro-bg.mp4"
   */
  loadingBackground: "",
  startBackground: "assets/images/bg_start.png",
  menuBackground: "",

  /* ---- AUDIO ----
   * Paths to sound effect files (.mp3, .ogg, .wav).
   * Leave empty ("") to use built-in Web Audio API synthesized sounds.
   *
   * Examples:
   *   "assets/audio/startup.mp3"
   *   "assets/audio/hover.ogg"
   */
  startupSound: "",
  hoverSound: "",
  selectSound: "",
  ambientSound: "assets/audio/bg_theme.mp3",

  /* ---- PIZZA SPRITE ----
   * Path to a pizza sprite for the loading screen.
   * It will bounce across the loading scene.
   * Example: "assets/images/pizza-sprite.png"
   */
  pizzaSprite: "",

  /* ---- TIMINGS (milliseconds) ---- */
  timings: {
    crtBootDuration: 2200,      // CRT power-on animation length
    loadingDuration: 4500,      // Loading bar fill time
    factRotateInterval: 2000,   // Time between pizza fact changes
    menuRotationSpeed: 45,      // Seconds per full ring rotation
    screenTransition: 600,      // Transition between screens
  },

  /* ---- COLORS ---- */
  colors: {
    primary: '#FFD700',         // Gold/Yellow — main accent
    secondary: '#FF8C00',       // Orange — secondary accent
    danger: '#CC4400',          // Deep red — shadow/danger
    neonCyan: '#00e5ff',        // Cyan — tech/info accent
    neonGreen: '#39ff14',       // Green — success/terminal
    neonPink: '#e040fb',        // Pink — highlight
    neonOrange: '#ff6e40',      // Orange — warm accent
    neonPurple: '#b388ff',      // Purple — sponsor/special
    screenBg: '#0a0e1a',       // Deep blue-black — monitor interior
    bezelColor: '#1a1a2e',     // Monitor bezel
    textDim: 'rgba(224, 208, 255, 0.4)',
  },

  /* ---- MENU ITEMS ----
   * Each entry defines a navigation node on the circular menu ring.
   * - id: unique identifier, used as CSS/HTML id
   * - label: display text on the node
   * - icon: emoji or path to icon image
   * - color: hex color for glow/border
   *
   * Add, remove, or reorder items freely.
   * The circle automatically distributes them evenly.
   */
  menuItems: [
    {
      id: 'register',
      label: 'REGISTER',
      color: '#f1c40f',
      stats: { priority: 5, complexity: 1, rewards: 5 },
      info: 'Ready to hack? Assemble your team of 1-4 players and register now to claim your spot in the arcade arena. Space is limited!',
      actionText: 'START REGISTRATION',
      actionLink: '#',
      popup: {
        title: 'START REGISTRATION',
        body: '<div class="popup-section"><div class="popup-section-title">Who Can Participate?</div><p>Participation is open for everyone, whether you are a College Student or a Working Professional.</p></div><div class="popup-section"><div class="popup-section-title">Registration Link</div><a class="popup-link" href="https://hack.osdc.dev/register" target="_blank">hack.osdc.dev/register</a></div>'
      },
      iconPath: 'assets/icons/passport.png'
    },
    {
      id: 'dates',
      label: 'DATES',
      color: '#e74c3c',
      stats: { importance: 5, urgency: 4, reading: 1 },
      info: 'Don\'t miss a beat! Keep track of key dates: Registration deadline, opening ceremony, coding sprints, and project submission deadlines.',
      actionText: 'SAVE DATES',
      actionLink: '#',
      popup: {
        title: 'SAVE THE DATES',
        body: '<div class="popup-section"><div class="popup-section-title">Hackathon Dates</div><span class="popup-dates">10 July (6:00 PM) → 15 July (6:00 PM)</span></div>'
      },
      iconPath: 'assets/icons/calendar.png'
    },
    {
      id: 'remote',
      label: 'REMOTE',
      color: '#2ecc71',
      stats: { flexibility: 5, collaboration: 4, attendance: 3 },
      info: 'OSDHACK\'26 is hybrid! Join us physically at the main arcade venue or code remotely from anywhere in the universe with full Discord support.',
      actionText: 'JOIN DISCORD',
      actionLink: 'https://discord.com/invite/jiit-open-source-developer-s-community-475154983910899722',
      iconPath: 'assets/icons/location (1).png'
    },
    {
      id: 'rulebook',
      label: 'RULEBOOK',
      color: '#1abc9c',
      stats: { necessity: 5, strictness: 4, clarity: 5 },
      info: 'Read the rules before you start. Covers team formation, code repositories, intellectual property rights, and fair play guidelines.',
      actionText: 'OPEN HANDBOOK',
      actionLink: '#',
      popup: {
        title: 'OPEN HANDBOOK',
        body: '<ol class="popup-rules"><li>Registration Deadline: 10 July, 2026, 06:00 PM</li><li>Team Composition: Solo or teams of up to 4 people.</li><li>Project Type: Build any software or hardware project following the On-Device AI theme.</li><li>Version Control: Use Git with a public repository.</li><li>Commit Timeline: All code must be written and committed during the hackathon.</li><li>Open Source: Projects must use an OSI-compliant FOSS license.</li><li>External Code: Open-source libraries/assets are allowed with proper attribution.</li><li>Originality: Projects must be original and not previously submitted.</li><li>Submission Platform: Submit on Unstop with repo link, description, and demo.</li><li>Discord Participation: Join the official Discord server for announcements and mini-events.</li><li>Rule Enforcement: Violations may lead to disqualification.</li><li>Plagiarism: Strictly prohibited.</li><li>Organizing Authority: The organizing team\'s decisions are final.</li></ol><div class="popup-rules-footer">Follow the rules. Embrace the chaos. Have fun!</div>'
      },
      iconPath: 'assets/icons/notes.png'
    },
    {
      id: 'timeline',
      label: 'TIMELINE',
      color: '#3498db',
      stats: { duration: 5, intensity: 5, focus: 4 },
      info: 'The official 48-hour schedule. T-minus starts soon! Tracks kickoffs, mentoring feedback slots, workshops, and presentation showcases.',
      actionText: 'VIEW SCHEDULE',
      actionLink: '#',
      popup: {
        title: 'VIEW SCHEDULE',
        body: '<div class="popup-section"><div class="popup-section-title">Timeline</div><ul class="popup-list"><li><strong>Opening Ceremony</strong> — July 10 (5:00 PM)</li><li><strong>Hacking Period</strong> — July 10 (6:00 PM) to July 15 (6:00 PM)</li><li><strong>Final Submission Deadline</strong> — July 15 (6:00 PM)</li></ul></div><div class="popup-section"><div class="popup-section-title">Mini Events</div><ul class="popup-list"><li><strong>Speed Typing</strong> — TBD</li><li><strong>Capture The Flag</strong> — TBD</li><li><strong>CodeBattleships</strong> — TBD</li></ul></div>'
      },
      iconPath: 'assets/icons/clock.png'
    },
    {
      id: 'theme',
      label: 'THEME',
      color: '#9b59b6',
      stats: { creativity: 5, nostalgia: 5, hype: 5 },
      info: 'The thematic wrapper for OSDHACK\'26. Think nostalgia, cabinet retro graphics, and pizza! Unleash your inner 80s arcade dev.',
      actionText: 'REVEAL SECRET',
      actionLink: '#',
      popup: {
        title: 'REVEAL THEME',
        body: '<div class="popup-section"><div class="popup-section-title">On-Device AI</div><p>Build smart software that lives on your device. Create privacy-friendly, offline-ready, lightweight AI projects that run locally on phones, laptops, browsers, edge devices, or embedded systems — no cloud dependency for the core magic.</p></div><div class="popup-section"><div class="popup-section-title">Examples</div><ul class="popup-list"><li>A browser tool that works offline</li><li>A privacy-friendly productivity app</li><li>An AI-powered accessibility tool</li><li>An embedded device that makes smart decisions without cloud access</li></ul></div><div class="popup-ending">Surprise us with your creativity!</div>'
      },
      iconPath: 'assets/icons/color-wheel.png'
    },
    {
      id: 'prizes',
      label: 'PRIZES',
      color: '#f39c12',
      stats: { bounty: 5, loot: 5, swag: 4 },
      info: 'Total bounty worth $10,000! Top teams win retro game cabinets, custom keycaps, mech keyboards, and cool custom swag bags.',
      actionText: 'VIEW BOUNTIES',
      actionLink: '#',
      popup: {
        title: 'VIEW BOUNTIES',
        body: '<div class="popup-section"><div class="popup-section-title">🏆 Hackathon Prizes</div><ul class="popup-list"><li>₹15,000 in Cash</li><li>Over ₹1,00,000 worth of CodeCrafters VIP Memberships</li><li>.xyz Domains</li><li>Goodies</li></ul></div><div class="popup-section"><div class="popup-section-title">🎮 Mini-Events Prizes</div><ul class="popup-list"><li>₹3,000 in Cash</li><li>Goodies</li></ul></div><div class="popup-rules-footer">Bring your best ideas to life and walk away with glory (and cash).</div>'
      },
      iconPath: 'assets/icons/stack-of-bills.png'
    },
    {
      id: 'downloadAssets',
      label: 'DOWNLOAD ASSETS',
      color: '#f39c12',
      stats: { utility: 5, variety: 4, size: 2 },
      info: 'Snag the official OSDHACK\'26 asset bundle: retro graphics, pixelated sound effects, color palette codes, and brand templates.',
      actionText: 'GET ASSETS PACK',
      actionLink: '#',
      iconPath: 'assets/icons/folder.png'
    },
    {
      id: 'speedTyping',
      label: 'SPEED TYPING',
      color: '#34495e',
      stats: { difficulty: 3, reflex: 5, fun: 5 },
      info: 'Compete in the side-quest typing tournament. Test your word-per-minute speed under pressure and top the global arcade leaderboard!',
      actionText: 'ABOUT SPEED TYPING',
      actionLink: '#',
      popup: {
        title: 'SPEED TYPING CHALLENGE',
        body: '<p>Put your fingers to the test! A lightning-fast keyboard showdown where speed meets style.</p><div class="popup-section"><div class="popup-section-title">Timeline</div><ul class="popup-list"><li><strong>Session 1</strong> → 12 July (12:00 PM - 1:00 PM)</li><li><strong>Session 2</strong> → 13 July (12:00 PM - 1:00 PM)</li><li><strong>Finals</strong> → 13 July (7:00 PM)</li></ul></div><div class="popup-section"><div class="popup-section-title">Rules</div><ul class="popup-list"><li>Participants will be given random text to type.</li><li>Accuracy and speed both count.</li><li>Top performers from the sessions qualify for finals.</li></ul></div><div class="popup-rules-footer">Type like the wind and leave the rest in the dust!</div>'
      },
      iconPath: 'assets/icons/geek.png'
    },
    {
      id: 'captureTheFlag',
      label: 'CAPTURE THE FLAG',
      color: '#e74c3c',
      stats: { difficulty: 4, cyber: 5, rewards: 5 },
      info: 'A parallel cybersecurity contest. Hack, patch, and capture target flags in reverse engineering, cryptography, and web security.',
      actionText: 'ABOUT CTF',
      actionLink: '#',
      popup: {
        title: 'CAPTURE THE FLAG (CTF)',
        body: '<p>It\'s not just a game—it\'s a digital battlefield. Solve puzzles, crack codes, and snag the flag in this mini-CTF.</p><div class="popup-section"><div class="popup-section-title">Event Timeline</div><ul class="popup-list"><li><strong>Starts:</strong> 12 July at 5:00 PM</li><li><strong>Ends:</strong> 13 July at 5:00 PM</li></ul></div><div class="popup-section"><div class="popup-section-title">Challenge Categories</div><ul class="popup-list"><li>Cryptography</li><li>Web Exploitation</li><li>Forensics</li><li>OSINT</li><li>General Skills</li><li>Miscellaneous</li></ul></div><div class="popup-section"><div class="popup-section-title">Rules</div><ul class="popup-list"><li>Team-based CTF</li><li>Flags must be submitted in the correct format.</li><li>Most points wins.</li></ul></div><div class="popup-rules-footer">Equal parts fun and challenge, ready to test your skills?</div>'
      },
      iconPath: 'assets/icons/flag.png'
    },
    {
      id: 'tracks',
      label: 'TRACKS',
      color: '#e040fb',
      stats: { tracks: 4, diversity: 5, innovation: 5 },
      info: 'Explore the four hacking tracks: 1) Web3 Cabinets, 2) AI Retro Agents, 3) Open-Source Arcade emulator, 4) Creative Hardware hacks.',
      actionText: 'READ TRACK DETAILS',
      actionLink: '#',
      iconPath: 'assets/icons/launch.png'
    },
    {
      id: 'faqs',
      label: 'FAQs',
      color: '#00e5ff',
      stats: { quantity: 5, help: 5, clarity: 4 },
      info: 'Answers to all your burning questions: team sizes, hardware allowance, food schedules (yes, there is pizza!), and online setup.',
      actionText: 'OPEN FAQ CENTER',
      actionLink: '#',
      popup: {
        title: 'FAQ CENTER',
        body: '<div style="text-align:center;padding:20px 0"><div style="font-size:12px;color:#00e5ff;margin-bottom:12px;text-shadow:0 0 8px rgba(0,229,255,0.4)">Transmission pending...</div><div style="font-size:10px;color:rgba(255,253,236,0.6);line-height:2">FAQ database is currently under construction.</div><div style="margin-top:16px;font-size:16px;animation:popupTraceMove 1.5s linear infinite;display:inline-block">⚙️</div></div>'
      },
      iconPath: 'assets/icons/caution.png'
    },
    {
      id: 'games',
      label: 'GAMES',
      color: '#e040fb',
      stats: { fun: 5, challenge: 4, rewards: 5 },
      info: 'Take a break and play some retro arcade mini-games between coding sessions. Compete for high scores and bragging rights!',
      actionText: 'PLAY ARCADE',
      actionLink: '#',
      iconPath: 'assets/icons/geek.png'
    },
    {
      id: 'sponsors',
      label: 'SPONSORS',
      color: '#b388ff',
      stats: { partners: 4, support: 5, swag: 5 },
      info: 'A huge thanks to our amazing sponsors who make OSDHACK possible. Check out their booths, grab swag, and learn about opportunities.',
      actionText: 'VIEW SPONSORS',
      actionLink: '#',
      popup: {
        title: 'OUR SPONSORS',
        body: '<p>A huge thanks to our amazing sponsors who make OSDHACK possible. Check out their booths, grab swag, and learn about opportunities.</p><div class="popup-section"><div class="popup-section-title">Our Partners</div><div class="sponsor-logos"><div class="sponsor-logo-item"><img src="assets/icons/codecrafters.png" alt="CodeCrafters" class="sponsor-logo-img"><span class="sponsor-logo-label">CodeCrafters</span></div><div class="sponsor-logo-item"><img src="assets/icons/xyz_logo (1).svg" alt=".xyz" class="sponsor-logo-img"><span class="sponsor-logo-label">.xyz</span></div></div></div>'
      },
      iconPath: 'assets/icons/suit.png'
    }
  ],

  /* ---- LOADING SCREEN FACTS ----
   * Displayed one at a time with typewriter animation.
   * At least 50 entries required for variety.
   * Add your own! Keep them short (under ~60 chars).
   */
  pizzaFacts: [
    "Pineapple pizza causes merge conflicts.",
    "Never deploy hungry.",
    "Production bugs love cold pizza.",
    "If it works on localhost, you're halfway there.",
    "Someone is debugging without console.log.",
    "Your teammate definitely forgot to push.",
    "Pizza and code share one truth: layers matter.",
    "The cheese pull is a metaphor for spaghetti code.",
    "Pepperoni: the original loading spinner.",
    "git commit -m 'added extra cheese'",
    "404: Pizza not found. Try reloading.",
    "Ctrl+Z won't un-eat that last slice.",
    "One does not simply 'just fix the CSS'.",
    "Hackathons run on caffeine and carbs.",
    "Your code compiles? Celebrate with pizza.",
    "npm install pizza --save-forever",
    "There's a bug in my pizza. Oh wait, that's an olive.",
    "First rule of hackathon: always order extra pizza.",
    "Debugging is like removing olives blindfolded.",
    "sudo make me a pizza",
    "The only framework you need: pizza box.",
    "Pizza toppings > npm dependencies.",
    "My code is like pizza: messy but functional.",
    "Semicolons are the pepperoni of code.",
    "Don't push to main on an empty stomach.",
    "Stack overflow? More like stack of pizza boxes.",
    "console.log('Is there more pizza?')",
    "Every great app starts with a pizza break.",
    "You can't unit test pizza quality.",
    "The cloud is just someone else's pizza oven.",
    "Dark mode saves battery. Pizza saves developers.",
    "Agile methodology: eat pizza in sprints.",
    "Remember: pizza is round, box is square, slices are triangles.",
    "Your code has fewer layers than a deep dish.",
    "Rubber duck debugging works better with pizza.",
    "The best code review happens over pizza.",
    "Cheese > blockchain. Fight me.",
    "Touch grass? I touch pizza.",
    "Hot take: tabs are superior. So is thin crust.",
    "Pizza delivery ETA > deployment ETA.",
    "Refactoring is just reheating pizza with extra steps.",
    "There are 10 types of developers: those who love pizza, and liars.",
    "Your API needs more endpoints. Your pizza needs more toppings.",
    "Microservices? More like micro-slices.",
    "Keep your friends close and your pizza closer.",
    "The real MVP: whoever orders the pizza.",
    "In a world of hamburger menus, be a pizza menu.",
    "Technical debt tastes like day-old pizza.",
    "Containerize your pizza for maximum portability.",
    "Don't be a 10x developer. Be a 10-slice developer.",
    "Pizza is proof that good things come in circles.",
    "Your commit messages should be as clear as your pizza order.",
    "async/await for pizza delivery.",
    "The DOM is like pizza dough: stretch it too far and it breaks.",
    "Infinite scroll? More like infinite pizza scroll.",
    "AI can write code but it can't eat pizza.",
    "The blockchain of pizza: from oven to box to mouth.",
    "Types of tests: unit, integration, and pizza taste test.",
    "Loading extra cheese modules...",
  ],
};
