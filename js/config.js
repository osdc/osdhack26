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
        body: '<div class="modal-section"><div class="modal-section-title">Who Can Participate?</div><p>Participation is open for everyone, whether you are a College Student or a Working Professional.</p></div><div class="modal-section"><div class="modal-section-title">Registration Link</div><a class="modal-retro-btn" href="https://hack.osdc.dev/register" target="_blank">hack.osdc.dev/register</a></div>'
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
        body: '<img class="modal-calendar-icon" src="assets/icons/calendar.png" alt="calendar" draggable="false"><div class="modal-section"><div class="modal-section-title">Hackathon Dates</div><p style="text-align:center;font-size:10px;line-height:2">11 July, 7:00 PM<br><span style="color:#ffd700;font-size:14px">↓</span><br>13 July, 11:59 PM</p></div>'
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
      actionLink: '#',
      popup: {
        title: 'JOIN REMOTE',
        body: '<div class="modal-section"><div class="modal-section-title">Hybrid Participation</div><p>OSDHACK\'26 is fully hybrid! You can participate from anywhere in the world.</p></div><div class="modal-section"><div class="modal-section-title">Join Our Discord</div><a class="modal-retro-btn" href="https://discord.com/invite/jiit-open-source-developer-s-community-475154983910899722" target="_blank">discord.gg/jiit-osdc</a></div>'
      },
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
        title: 'Official Handbook',
        body: '<div class="modal-section"><ol style="padding-left:20px"><li><strong>Registration Deadline:</strong> 10 July, 2026, 06:00 PM</li><li><strong>Team Composition:</strong> Solo or teams of up to 4 people.</li><li><strong>Project Type:</strong> Build any software or hardware project following the On-Device AI theme.</li><li><strong>Version Control:</strong> Use Git with a public repository.</li><li><strong>Commit Timeline:</strong> All code must be written and committed during the hackathon.</li><li><strong>Open Source:</strong> Projects must use an OSI-compliant FOSS license.</li><li><strong>External Code:</strong> Open-source libraries/assets are allowed with proper attribution.</li><li><strong>Originality:</strong> Projects must be original and not previously submitted.</li><li><strong>Submission Platform:</strong> Submit on Unstop with repo link, description, and demo.</li><li><strong>Discord Participation:</strong> Join the official Discord server for announcements and mini-events.</li><li><strong>Rule Enforcement:</strong> Violations may lead to disqualification.</li><li><strong>Plagiarism:</strong> Strictly prohibited.</li><li><strong>Organizing Authority:</strong> The organizing team&#39;s decisions are final.</li></ol></div><div class="modal-ending">Follow the rules. Embrace the chaos. Have fun!</div>'
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
        title: 'Timeline',
        body: '<div class="modal-section"><div class="modal-section-title">Timeline</div><ul><li><strong>Opening Ceremony</strong><br>July 10 (5:00 PM)</li><li><strong>Hacking Period</strong><br>July 10 (6:00 PM)<br><span style="color:#ffd700;font-size:12px">↓</span><br>July 15 (6:00 PM)</li><li><strong>Final Submission</strong><br>July 15 (6:00 PM)</li></ul></div><div class="modal-section"><div class="modal-section-title">Mini Events</div><ul><li>Speed Typing — TBD</li><li>Capture The Flag — TBD</li><li>CodeBattleships — TBD</li></ul></div>'
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
        title: 'On-Device AI',
        body: '<div class="modal-section"><div class="modal-section-title">On-Device AI</div><p>Build smart software that lives on your device.</p><p>Create privacy-friendly, offline-ready, lightweight AI projects that run locally on phones, laptops, browsers, edge devices, or embedded systems — no cloud dependency for the core magic.</p></div><div class="modal-section"><div class="modal-section-title">Examples</div><ul><li>Offline browser tools</li><li>Privacy-first productivity apps</li><li>AI accessibility tools</li><li>Embedded AI devices</li></ul></div><div class="modal-ending">Surprise us with your creativity!</div>'
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
        title: 'View Bounties',
        body: '<div class="modal-section"><div class="modal-section-title">🏆 Hackathon Prizes</div><ul><li>₹15,000 in Cash</li><li>Over ₹1,00,000 worth of CodeCrafters VIP Memberships</li><li>.xyz Domains</li><li>Goodies</li></ul></div><div class="modal-section"><div class="modal-section-title">🎮 Mini Event Prizes</div><ul><li>₹3,000 in Cash</li><li>Goodies</li></ul></div><div class="modal-ending">Bring your best ideas to life and walk away with glory (and cash).</div>'
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
      popup: {
        title: 'DOWNLOAD ASSETS',
        body: '<div class="modal-section"><div class="modal-section-title">Official Asset Bundle</div><p>The OSDHACK\'26 asset pack includes retro graphics, pixel sound effects, color palettes, and brand templates to level up your project.</p></div><div class="modal-section"><div class="modal-section-title">What\'s Inside</div><ul><li>Retro pixel graphics & sprites</li><li>Sound effect samples</li><li>Official color palette</li><li>Brand templates & logos</li></ul></div>'
      },
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
        title: 'Speed Typing Challenge',
        body: '<p>Put your fingers to the test! A lightning-fast keyboard showdown where speed meets style.</p><div class="modal-section"><div class="modal-section-title">Timeline</div><ul><li><strong>Session 1</strong><br>12 July, 12:00 PM – 1:00 PM</li><li><strong>Session 2</strong><br>13 July, 12:00 PM – 1:00 PM</li><li><strong>Finals</strong><br>13 July, 7:00 PM</li></ul></div><div class="modal-section"><div class="modal-section-title">Rules</div><ul><li>Random text challenges</li><li>Speed and accuracy both count</li><li>Top performers qualify for finals</li></ul></div><div class="modal-ending">Type like the wind and leave the rest in the dust!</div>'
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
        title: 'Capture The Flag (CTF)',
        body: '<p>It\'s not just a game—it\'s a digital battlefield. Solve puzzles, crack codes, and snag the flag.</p><div class="modal-section"><div class="modal-section-title">Timeline</div><ul><li><strong>Starts</strong><br>12 July, 5:00 PM</li><li><strong>Ends</strong><br>13 July, 5:00 PM</li></ul></div><div class="modal-section"><div class="modal-section-title">Categories</div><ul><li>Cryptography</li><li>Web Exploitation</li><li>Forensics</li><li>OSINT</li><li>General Skills</li><li>Miscellaneous</li></ul></div><div class="modal-section"><div class="modal-section-title">Rules</div><ul><li>Team based</li><li>Submit flags in correct format</li><li>Highest score wins</li></ul></div><div class="modal-ending">Equal parts fun and challenge, ready to test your skills?</div>'
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
      popup: {
        title: 'HACKING TRACKS',
        body: ''
      },
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
        title: 'FAQ Center',
        body: '<div class="faq-terminal"><div class="faq-terminal-line">Transmission pending...</div><div class="faq-terminal-sub">FAQ database is currently under construction.</div><div class="faq-terminal-spinner">⚙️</div></div>'
      },
      iconPath: 'assets/icons/caution.png'
    },
    {
      id: 'battleships',
      label: 'BATTLESHIPS',
      color: '#00acc1',
      stats: { fun: 5, strategy: 5, challenge: 4 },
      info: 'Command your fleet and outmanoeuvre opponents in the ultimate coding battleship showdown. Strategy meets syntax in this nautical mini-game!',
      actionText: 'PLAY BATTLESHIPS',
      actionLink: '#',
      popup: {
        title: 'Code. Sink. Conquer.',
        body: '<p>A strategic coding duel where classic Battleships meets programming challenges.</p><div class="modal-section"><div class="modal-section-title">Timeline</div><ul><li><strong>Starts</strong><br>14 July, 12:00 PM</li><li><strong>Ends</strong><br>14 July, 2:00 PM</li></ul></div><div class="modal-section"><div class="modal-section-title">How It Works</div><ul><li>Players are matched against opponents</li><li>Players place ships</li><li>Solve coding challenges to earn attacks</li><li>Winning grants a shot</li><li>Incorrect answers give opponents a free shot</li><li>Some wrong moves hide previously revealed cells</li><li>Match ends when one fleet is destroyed</li></ul></div><div class="modal-section"><div class="modal-section-title">Rules</div><ul><li>Team registration</li><li>Individual matches</li><li>Individual scores contribute to team score</li><li>Highest total team score wins</li><li>Ratings and leaderboard update after every match</li></ul></div><div class="modal-ending">Out-code your opponent, sink their fleet, and lead your team to victory!</div>'
      },
      iconPath: 'assets/icons/Battleship.png'
    },
    {
      id: 'games',
      label: 'GAMES',
      color: '#e040fb',
      stats: { fun: 5, challenge: 4, rewards: 5 },
      info: 'Take a break and play some retro arcade mini-games between coding sessions. Compete for high scores and bragging rights!',
      actionText: 'PLAY ARCADE',
      actionLink: '#',
      popup: {
        title: 'ARCADE MINI-GAMES',
        body: '<div class="modal-section"><div class="modal-section-title">Take a Break!</div><p>Step away from the coding terminal and dive into our retro arcade mini-games. Compete for high scores and earn bragging rights among fellow hackers!</p></div><div class="modal-section"><div class="modal-section-title">Featured Games</div><ul><li>Pixel Pong</li><li>Space Invaders</li><li>Snake Rally</li><li>And more!</li></ul></div>'
      },
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
        body: '<p>A huge thanks to our amazing sponsors who make OSDHACK possible. Check out their booths, grab swag, and learn about opportunities.</p><div class="modal-section"><div class="modal-section-title">Our Partners</div><div class="sponsor-logos"><div class="sponsor-logo-item"><img src="assets/icons/codecrafters.png" alt="CodeCrafters" class="sponsor-logo-img"><span class="sponsor-logo-label">CodeCrafters</span></div><div class="sponsor-logo-item"><img src="assets/icons/xyz_logo (1).svg" alt=".xyz" class="sponsor-logo-img"><span class="sponsor-logo-label">.xyz</span></div></div></div>'
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
