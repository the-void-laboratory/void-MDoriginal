/**
 * Dynamic Form Builder Component
 * Generates form inputs based on command specifications
 */
export class FormBuilder {
  static renderInput(input) {
    switch (input.type) {
      case 'textarea':
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">${this.escape(input.label)}</label>
            <textarea 
              id="input-${input.id}"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px] font-mono text-sm"
              placeholder="${this.escape(input.placeholder || '')}"
              ${input.required ? 'required' : ''}
            ></textarea>
            ${input.hint ? `<p class="text-xs text-slate-600 mt-1">${this.escape(input.hint)}</p>` : ''}
          </div>
        `;
      
      case 'select':
        const options = (input.options || []).map(opt => 
          `<option value="${opt}">${this.escape(opt.toUpperCase())}</option>`
        ).join('');
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">${this.escape(input.label)}</label>
            <select id="input-${input.id}" class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" ${input.required ? 'required' : ''}>
              <option value="">Select Option</option>
              ${options}
            </select>
          </div>
        `;
      
      case 'radio':
        const radioOptions = (input.options || []).map(opt => `
          <label class="flex items-center p-2 rounded hover:bg-slate-700/30 cursor-pointer">
            <input type="radio" name="${input.id}" value="${opt}" class="mr-3" ${input.default === opt ? 'checked' : ''}>
            <span class="text-sm text-slate-300">${this.escape(opt)}</span>
          </label>
        `).join('');
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-3">${this.escape(input.label)}</label>
            <div class="space-y-2">
              ${radioOptions}
            </div>
          </div>
        `;
      
      case 'checkbox':
        return `
          <div class="flex items-center gap-2 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
            <input type="checkbox" id="input-${input.id}" ${input.default ? 'checked' : ''} class="rounded">
            <label for="input-${input.id}" class="text-sm text-slate-300">${this.escape(input.label)}</label>
          </div>
        `;
      
      default:
        return `
          <div>
            <label class="block text-xs font-semibold text-slate-500 uppercase mb-2">${this.escape(input.label)}</label>
            <input 
              type="text"
              id="input-${input.id}"
              class="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="${this.escape(input.placeholder || '')}"
              ${input.required ? 'required' : ''}
            />
            ${input.hint ? `<p class="text-xs text-slate-600 mt-1">${this.escape(input.hint)}</p>` : ''}
          </div>
        `;
    }
  }

  static escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  static collectValues(inputs) {
    const values = {};
    inputs.forEach(input => {
      const element = document.getElementById(`input-${input.id}`);
      if (element) {
        if (input.type === 'checkbox') {
          values[input.id] = element.checked;
        } else if (input.type === 'radio') {
          values[input.id] = document.querySelector(`input[name="${input.id}"]:checked`)?.value || '';
        } else {
          values[input.id] = element.value;
        }
      }
    });
    return values;
  }
}
