import { COMMAND_REGISTRY, CATEGORIES, getCommandsByCategory } from '../utils/commandRegistry.js';
import { WelcomePage } from './commands/GroupCommands/WelcomePage.js';
import { AntiLinkPage } from './commands/GroupCommands/AntiLinkPage.js';
import { Modal } from '../components/Modal.js';
import { FormBuilder } from '../components/FormBuilder.js';

const PAGE_MAPPINGS = {
  'welcome': WelcomePage,
  'antilink': AntiLinkPage,
};

/**
 * Main Commands Page
 * Displays all commands organized by category with modal/page routing
 */
class CommandsPage {
  constructor() {
    this.container = null;
    this.currentModal = null;
  }

  async initialize(containerId = 'commands-root') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('❌ Container not found:', containerId);
      return;
    }
    this.render();
  }

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
          <div id="categories-container" class="space-y-8"></div>
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

  renderCategories() {
    const container = document.getElementById('categories-container');
    
    Object.entries(CATEGORIES).forEach(([key, cat]) => {
      const commands = getCommandsByCategory(key);
      
      if (commands.length === 0) return;

      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'bg-[#111] p-6 rounded-lg border border-slate-800/50 hover:border-blue-600/30 transition-colors';
      
      const commandsHTML = commands.map(cmd => `
        <button
          class="command-btn flex items-center px-3 py-2 bg-[#161616] border border-slate-800/50 rounded hover:border-blue-600/50 hover:bg-[#202020] active:bg-blue-600/20 transition-all duration-200 group"
          data-command="${this.escape(cmd.name)}"
          title="${this.escape(cmd.description || '')}"
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

  attachEventListeners() {
    const commandBtns = document.querySelectorAll('.command-btn');
    commandBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const commandName = e.currentTarget.dataset.command;
        const command = COMMAND_REGISTRY[commandName];
        if (command) {
          this.handleCommandClick(command);
        }
      });
    });
  }

  handleCommandClick(command) {
    console.log(`📋 Selected command: ${command.name}`);
    
    if (this.currentModal) {
      this.currentModal.close();
    }

    const PageClass = PAGE_MAPPINGS[command.name];
    
    if (PageClass) {
      this.currentModal = new PageClass(command, (name, params) => this.executeCommand(name, params));
    } else {
      this.currentModal = new GenericCommandModal(command, (name, params) => this.executeCommand(name, params));
    }
    
    this.currentModal.open();
  }

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

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

/**
 * Generic Command Modal
 * Used for commands without custom pages
 */
class GenericCommandModal extends Modal {
  constructor(command, onExecute) {
    super({
      id: 'generic-modal-' + command.name,
      title: `.${command.name}`,
      width: 'max-w-lg'
    });
    this.command = command;
    this.onExecute = onExecute;
  }

  render() {
    const modal = super.create();
    
    const inputs = this.command.inputs || [];
    const inputsHTML = inputs.map(input => FormBuilder.renderInput(input)).join('');

    modal.innerHTML = `
      <div class="bg-[#0f172a] border border-blue-900/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_-12px_rgba(30,58,138,0.5)]">
        <div class="p-8">
          <h3 class="text-2xl font-black text-white mb-2 flex items-center">
            <span class="text-blue-500 mr-2">❖</span> ${this.escape(`.${this.command.name}`)}
          </h3>
          <p class="text-slate-400 text-sm mb-6">
            ${this.command.description || ''}
          </p>

          <form id="command-form" class="space-y-4">
            ${inputsHTML}
            ${!inputs.length ? '<p class="text-slate-300 text-center py-4 bg-slate-800/30 rounded-lg">Are you sure you want to run this command?</p>' : ''}
          </form>
        </div>

        <div class="bg-slate-800/50 p-4 flex justify-end gap-3">
          <button id="modal-cancel" class="px-4 py-2 text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button id="modal-execute" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center gap-2">
            ⚡ Execute
          </button>
        </div>
      </div>
    `;

    return modal;
  }

  open() {
    super.open();
    this.render();
    super.attachEventListeners();
    this.setupFormHandlers();
  }

  setupFormHandlers() {
    const cancelBtn = document.getElementById('modal-cancel');
    const executeBtn = document.getElementById('modal-execute');

    cancelBtn.addEventListener('click', () => this.close());
    executeBtn.addEventListener('click', () => this.handleExecute());
  }

  async handleExecute() {
    const executeBtn = document.getElementById('modal-execute');
    executeBtn.disabled = true;
    executeBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Executing...';

    try {
      const values = FormBuilder.collectValues(this.command.inputs || []);
      await this.onExecute(this.command.name, values);
      this.close();
    } catch (error) {
      console.error('Command execution error:', error);
      alert('❌ Error executing command');
    } finally {
      executeBtn.disabled = false;
      executeBtn.innerHTML = '⚡ Execute';
    }
  }

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CommandsPage;
}

// Auto-initialize
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const page = new CommandsPage();
    page.initialize('commands-root');
  });
}
