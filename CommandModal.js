// CommandModal.js - Pure JavaScript implementation
class CommandModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
    this.isLoading = false;
    this.command = null;
    this.onExecuteCallback = null;
  }

  open(command, onExecute) {
    this.command = command;
    this.onExecuteCallback = onExecute;
    this.isOpen = true;
    this.render();
  }

  close() {
    if (this.modal) {
      this.modal.remove();
    }
    this.isOpen = false;
  }

  render() {
    // Remove existing modal
    const existing = document.getElementById('command-modal');
    if (existing) existing.remove();

    // Create modal HTML
    this.modal = document.createElement('div');
    this.modal.id = 'command-modal';
    this.modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4';
    
    const inputs = this.command.inputs || [];
    const inputsHTML = inputs.map(input => this.renderInput(input)).join('');

    this.modal.innerHTML = `
      <div class="bg-[#0f172a] border border-blue-900/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_-12px_rgba(30,58,138,0.5)]">
        <div class="p-8">
          <h3 class="text-2xl font-black text-white mb-2 flex items-center">
            <span class="text-blue-500 mr-2">❖</span> .${this.command.name}
          </h3>
          <p class="text-slate-400 text-sm mb-6">
            ${inputs.length ? 'Configure settings for this command.' : 'This command has no parameters.'}
          </p>

          <div class="space-y-4" id="modal-inputs">
            ${inputsHTML}
            ${!inputs.length ? '<p class="text-slate-300 text-center py-4 bg-slate-800/30 rounded-lg">Are you sure you want to run this command?</p>' : ''}
          </div>
        </div>

        <div class="bg-slate-800/50 p-4 flex justify-end gap-3">
          <button id="modal-cancel" class="px-4 py-2 text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button id="modal-execute" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center gap-2">
            Execute
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);
    this.attachEventListeners();
  }

  renderInput(input) {
    switch (input.type) {
      case 'textarea':
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">${input.label}</label>
            <textarea 
              id="input-${input.id}"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="${input.placeholder || ''}"
            ></textarea>
          </div>
        `;
      case 'select':
        const options = (input.options || []).map(opt => 
          `<option value="${opt}">${opt.toUpperCase()}</option>`
        ).join('');
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">${input.label}</label>
            <select id="input-${input.id}" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select Option</option>
              ${options}
            </select>
          </div>
        `;
      default:
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-1">${input.label}</label>
            <input 
              type="text"
              id="input-${input.id}"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="${input.placeholder || ''}"
            />
          </div>
        `;
    }
  }

  attachEventListeners() {
    const cancelBtn = document.getElementById('modal-cancel');
    const executeBtn = document.getElementById('modal-execute');

    cancelBtn.addEventListener('click', () => this.close());
    executeBtn.addEventListener('click', () => this.handleExecute());

    // Close on background click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });
  }

  async handleExecute() {
    this.isLoading = true;
    const executeBtn = document.getElementById('modal-execute');
    executeBtn.disabled = true;
    executeBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Executing...';

    try {
      // Collect input values
      const values = {};
      (this.command.inputs || []).forEach(input => {
        const element = document.getElementById(`input-${input.id}`);
        if (element) values[input.id] = element.value;
      });

      if (this.onExecuteCallback) {
        await this.onExecuteCallback(this.command.name, values);
      }

      this.close();
    } catch (error) {
      console.error('Command execution error:', error);
      alert('❌ Error executing command');
    } finally {
      this.isLoading = false;
    }
  }
}

module.exports = CommandModal;
