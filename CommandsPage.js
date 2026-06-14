// CommandsPage.js - Pure JavaScript implementation for Node.js/web.js integration
const CommandModal = require('./CommandModal');
const { CATEGORIES, ALL_COMMANDS } = require('./commands');

class CommandsPage {
  constructor() {
    this.modal = new CommandModal();
    this.container = null;
  }

  /**
   * Initialize the commands page in a given container
   * @param {string} containerId - DOM element ID to render into
   */
  async initialize(containerId = 'commands-root') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('❌ Container not found:', containerId);
      return;
    }
    this.render();
  }

  /**
   * Render the main page structure
   */
  render() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-[#0a0a0a] text-slate-200 p-4 md:p-8 font-mono">
        <div class="max-w-7xl mx-auto space-y-12">
          <!-- Header -->
          <div class="mb-8 border-b border-blue-900/30 pb-6">
            <h1 class="text-4xl font-black text-blue-500 tracking-widest mb-2">
              ❖ VOID MD COMMANDS ❖
            </h1>
            <p class="text-slate-400">Click any command to open its configuration panel</p>
          </div>

          <!-- Categories Container -->
          <div id="categories-container"></div>
        </div>

        <!-- Loading Indicator -->
        <div id="loading-indicator" class="hidden fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 z-40">
          <div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          <span>Executing command...</span>
        </div>
      </div>
    `;

    this.renderCategories();
    this.attachEventListeners();
  }

  /**
   * Render all command categories and buttons
   */
  renderCategories() {
    const container = document.getElementById('categories-container');
    
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'bg-[#111] p-6 rounded-lg border border-slate-800/50 hover:border-blue-600/30 transition-colors';
      
      const commands = ALL_COMMANDS.filter(cmd => cmd.category === key);
      
      let commandsHTML = commands.map(cmd => `
        <button
          class="command-btn flex items-center px-3 py-2 bg-[#161616] border border-slate-800/50 rounded hover:border-blue-600/50 hover:bg-[#202020] active:bg-blue-600/20 transition-all duration-200 group text-left"
          data-command="${this.escape(cmd.name)}"
          title="Execute: ${this.escape(cmd.name)}"
        >
          <span class="text-slate-600 font-bold group-hover:text-blue-500 mr-2 transition-colors">*│*</span>
          <span class="text-sm tracking-tight text-slate-300 group-hover:text-white">.${this.escape(cmd.name)}</span>
        </button>
      `).join('');

      categoryDiv.innerHTML = `
        <h2 class="text-blue-500 text-xl font-bold mb-4 flex items-center tracking-widest uppercase">
          ${cat.label}
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          ${commandsHTML}
        </div>
        <div class="text-slate-700 text-xs mt-4 tracking-[0.2em]">
          ┗┅┅┅┅┅┅┅┅┅┅┅➢
        </div>
      `;

      container.appendChild(categoryDiv);
    });
  }

  /**
   * Attach click handlers to command buttons
   */
  attachEventListeners() {
    const commandBtns = document.querySelectorAll('.command-btn');
    commandBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const commandName = e.currentTarget.dataset.command;
        const command = ALL_COMMANDS.find(c => c.name === commandName);
        if (command) {
          this.handleCommandClick(command);
        }
      });
    });
  }

  /**
   * Handle command button click
   */
  handleCommandClick(command) {
    console.log(`📋 Selected command: ${command.name}`);
    this.modal.open(command, (name, params) => this.executeCommand(name, params));
  }

  /**
   * Execute command via backend API
   */
  async executeCommand(name, params) {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) loadingIndicator.classList.remove('hidden');

    try {
      console.log(`🚀 Executing: ${name}`, params);
      
      const response = await fetch('/api/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: name, params })
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Command executed: ${name}`, data);
        alert(`✅ Command "${name}" executed successfully!\n\n${data.message || ''}`);
      } else {
        console.error(`❌ Command failed: ${data.error}`);
        alert(`❌ Error: ${data.error || 'Command execution failed'}`);
      }
    } catch (error) {
      console.error('🔴 Network error:', error);
      alert(`🔴 Connection Error\n\nMake sure your bot server is running on port 3000.\n\nError: ${error.message}`);
    } finally {
      if (loadingIndicator) loadingIndicator.classList.add('hidden');
    }
  }

  /**
   * Escape HTML special characters
   */
  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandsPage;
}

// Auto-initialize for browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const page = new CommandsPage();
    page.initialize('commands-root');
  });
}
