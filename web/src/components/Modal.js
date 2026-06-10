/**
 * Base Modal Component
 * Provides core modal functionality for all command interfaces
 */
export class Modal {
  constructor(options = {}) {
    this.id = options.id || 'modal-' + Date.now();
    this.title = options.title || 'Modal';
    this.width = options.width || 'max-w-lg';
    this.isOpen = false;
    this.modal = null;
    this.onClose = options.onClose || (() => {});
  }

  /**
   * Create the modal element
   */
  create() {
    if (this.modal) return this.modal;
    
    this.modal = document.createElement('div');
    this.modal.id = this.id;
    this.modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4';
    
    return this.modal;
  }

  /**
   * Render modal with content
   */
  render(contentHTML) {
    const modal = this.create();
    
    modal.innerHTML = `
      <div class="bg-[#0f172a] border border-blue-900/30 rounded-2xl w-full ${this.width} overflow-hidden shadow-[0_0_50px_-12px_rgba(30,58,138,0.5)]">
        <div class="p-8">
          <h3 class="text-2xl font-black text-white mb-2 flex items-center">
            <span class="text-blue-500 mr-2">❖</span> ${this.escape(this.title)}
          </h3>
          ${contentHTML}
        </div>
      </div>
    `;

    return modal;
  }

  /**
   * Open the modal
   */
  open() {
    this.isOpen = true;
    const modal = this.create();
    if (!modal.parentNode) {
      document.body.appendChild(modal);
    }
    modal.classList.remove('hidden');
  }

  /**
   * Close the modal
   */
  close() {
    this.isOpen = false;
    if (this.modal) {
      this.modal.remove();
    }
    this.onClose();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Attach event handlers
   */
  attachEventListeners() {
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.close();
      });
    }
  }
}
