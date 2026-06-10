import { Modal } from '../../../components/Modal.js';

/**
 * AntiLink Command Custom Page
 * Advanced configuration interface for link protection settings
 */
export class AntiLinkPage extends Modal {
  constructor(command, onExecute) {
    super({
      id: 'antilink-modal',
      title: `.${command.name} - Link Protection`,
      width: 'max-w-2xl'
    });
    this.command = command;
    this.onExecute = onExecute;
  }

  render() {
    const modal = super.create();
    
    modal.innerHTML = `
      <div class="bg-[#0f172a] border border-blue-900/30 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_-12px_rgba(30,58,138,0.5)]">
        <div class="p-8 space-y-6">
          <!-- Header -->
          <div>
            <h3 class="text-2xl font-black text-white mb-2 flex items-center">
              <span class="text-blue-500 mr-2">❖</span> Anti-Link Configuration
            </h3>
            <p class="text-slate-400 text-sm">Protect your group from unwanted links</p>
          </div>

          <form id="antilink-form" class="space-y-6">
            <!-- Status Toggle -->
            <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-3">Status</label>
              <div class="flex gap-2">
                <button type="button" class="status-btn flex-1 py-2 px-3 rounded-lg font-semibold transition bg-blue-600 text-white" data-value="on">
                  <span class="inline-block w-2 h-2 rounded-full bg-green-400 mr-2"></span> ON
                </button>
                <button type="button" class="status-btn flex-1 py-2 px-3 rounded-lg font-semibold transition bg-slate-700/50 text-slate-300" data-value="off">
                  <span class="inline-block w-2 h-2 rounded-full bg-red-500 mr-2"></span> OFF
                </button>
              </div>
              <input type="hidden" id="input-status" value="on">
            </div>

            <!-- Action on Link -->
            <div class="bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-3">Action When Link Detected</label>
              <div class="space-y-2">
                <label class="flex items-center p-2 rounded hover:bg-slate-700/30 cursor-pointer">
                  <input type="radio" name="input-action" value="kick" class="mr-3" checked>
                  <span class="text-sm text-slate-300">Kick user from group</span>
                </label>
                <label class="flex items-center p-2 rounded hover:bg-slate-700/30 cursor-pointer">
                  <input type="radio" name="input-action" value="delete" class="mr-3">
                  <span class="text-sm text-slate-300">Delete message only</span>
                </label>
                <label class="flex items-center p-2 rounded hover:bg-slate-700/30 cursor-pointer">
                  <input type="radio" name="input-action" value="warn" class="mr-3">
                  <span class="text-sm text-slate-300">Send warning (3 warnings = kick)</span>
                </label>
                <label class="flex items-center p-2 rounded hover:bg-slate-700/30 cursor-pointer">
                  <input type="radio" name="input-action" value="mute" class="mr-3">
                  <span class="text-sm text-slate-300">Mute user temporarily (30 min)</span>
                </label>
              </div>
            </div>

            <!-- Whitelist -->
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Whitelisted Domains (Optional)</label>
              <p class="text-xs text-slate-600 mb-3">Links from these domains will be allowed (one per line)</p>
              <textarea 
                id="input-whitelist"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] font-mono text-sm"
                placeholder="https://example.com\nhttps://trusted-site.com\ngithub.com"
              ></textarea>
            </div>

            <!-- Admin Exemption -->
            <div class="flex items-center gap-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              <input type="checkbox" id="input-exempt-admins" checked class="rounded">
              <label for="input-exempt-admins" class="text-sm text-slate-300">Exempt group admins from anti-link rules</label>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="bg-slate-800/50 p-4 flex justify-end gap-3">
          <button id="cancel-btn" class="px-4 py-2 text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button id="save-btn" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center gap-2">
            🛡️ Save Configuration
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
    const statusInput = document.getElementById('input-status');
    const statusBtns = document.querySelectorAll('.status-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-btn');

    // Status toggle
    statusBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        statusBtns.forEach(b => {
          b.classList.remove('bg-blue-600', 'text-white');
          b.classList.add('bg-slate-700/50', 'text-slate-300');
        });
        
        const target = e.currentTarget;
        target.classList.remove('bg-slate-700/50', 'text-slate-300');
        target.classList.add('bg-blue-600', 'text-white');
        
        statusInput.value = target.dataset.value;
      });
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => this.close());

    // Save button
    saveBtn.addEventListener('click', async () => {
      const status = statusInput.value;
      const action = document.querySelector('input[name="input-action"]:checked').value;
      const whitelist = document.getElementById('input-whitelist').value;
      const exemptAdmins = document.getElementById('input-exempt-admins').checked;

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Saving...';

        await this.onExecute(this.command.name, {
          status,
          action,
          whitelist: whitelist ? whitelist.split('\n').filter(l => l.trim()) : [],
          exemptAdmins
        });

        this.close();
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '🛡️ Save Configuration';
      }
    });
  }
}
