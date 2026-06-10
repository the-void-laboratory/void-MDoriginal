import { Modal } from '../../../components/Modal.js';
import { FormBuilder } from '../../../components/FormBuilder.js';

/**
 * Welcome Command Custom Page
 * Allows users to configure welcome messages with live preview
 */
export class WelcomePage extends Modal {
  constructor(command, onExecute) {
    super({
      id: 'welcome-modal',
      title: `.${command.name} - Welcome Message`,
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
              <span class="text-blue-500 mr-2">❖</span> Welcome Message Configuration
            </h3>
            <p class="text-slate-400 text-sm">Customize the message sent when users join your group</p>
          </div>

          <form id="welcome-form" class="space-y-4">
            <!-- Message Input -->
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Welcome Message</label>
              <textarea 
                id="input-message"
                class="w-full bg-slate-800 border border-slate-700 rounded-lg p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] font-mono text-sm"
                placeholder="Hi @user, welcome to @group!\n\nAvailable variables:\n@user - User's WhatsApp name\n@group - Group name\n@members - Total members"
              ></textarea>
              <p class="text-xs text-slate-500 mt-2">Available variables: @user, @group, @members</p>
            </div>

            <!-- Preview -->
            <div>
              <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">Live Preview</label>
              <div id="preview" class="w-full bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-slate-300 text-sm min-h-[100px] whitespace-pre-wrap break-words">
                (Preview will appear here)
              </div>
            </div>

            <!-- Settings -->
            <div class="grid grid-cols-2 gap-4 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" id="input-dm" class="mr-3 rounded">
                <div>
                  <span class="text-sm text-slate-300 block">Send via DM</span>
                  <span class="text-xs text-slate-600">Privately to new member</span>
                </div>
              </label>
              <label class="flex items-center cursor-pointer">
                <input type="checkbox" id="input-mention" class="mr-3 rounded">
                <div>
                  <span class="text-sm text-slate-300 block">Mention User</span>
                  <span class="text-xs text-slate-600">@mention the new member</span>
                </div>
              </label>
            </div>
          </form>
        </div>

        <!-- Footer -->
        <div class="bg-slate-800/50 p-4 flex justify-end gap-3">
          <button id="cancel-btn" class="px-4 py-2 text-slate-400 hover:text-white transition">
            Cancel
          </button>
          <button id="save-btn" class="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition flex items-center gap-2">
            💾 Save Configuration
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
    const messageInput = document.getElementById('input-message');
    const previewDiv = document.getElementById('preview');
    const cancelBtn = document.getElementById('cancel-btn');
    const saveBtn = document.getElementById('save-btn');

    // Live preview
    messageInput.addEventListener('input', () => {
      previewDiv.textContent = messageInput.value || '(Preview will appear here)';
    });

    // Cancel button
    cancelBtn.addEventListener('click', () => this.close());

    // Save button
    saveBtn.addEventListener('click', async () => {
      const message = messageInput.value.trim();
      const sendViaDM = document.getElementById('input-dm').checked;
      const mention = document.getElementById('input-mention').checked;

      if (!message) {
        alert('❌ Please enter a welcome message');
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<div class="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div> Saving...';

        await this.onExecute(this.command.name, {
          message,
          sendViaDM,
          mention
        });

        this.close();
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '💾 Save Configuration';
      }
    });

    // Show initial preview
    previewDiv.textContent = messageInput.value || '(Preview will appear here)';
  }
}
