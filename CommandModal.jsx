import React, { useState, useEffect } from 'react';

const CommandModal = ({ command, isOpen, onClose, onExecute }) => {
  const [values, setValues] = useState({});

  // Reset form values when command changes or modal closes
  useEffect(() => {
    if (!isOpen) setValues({});
  }, [isOpen, command]);

  if (!isOpen || !command) return null;

  const handleChange = (id, val) => {
    setValues(prev => ({ ...prev, [id]: val }));
  };

  const handleSubmit = () => {
    onExecute(command.name, values);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity">
      <div className="bg-[#0f172a] border border-blue-900/30 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_0_50px_-12px_rgba(30,58,138,0.5)]">
        <div className="p-8">
          <h3 className="text-2xl font-black text-white mb-2 flex items-center">
            <span className="text-blue-500 mr-2">❖</span> .{command.name}
          </h3>
          <p className="text-slate-400 text-sm mb-6">Configure settings for this command.</p>

          <div className="space-y-4">
            {command.inputs?.map((input) => (
              <div key={input.id}>
                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                  {input.label}
                </label>
                {input.type === 'textarea' ? (
                  <textarea
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder={input.placeholder}
                    onChange={(e) => handleChange(input.id, e.target.value)}
                  />
                ) : input.type === 'select' ? (
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                    onChange={(e) => handleChange(input.id, e.target.value)}
                  >
                    <option value="">Select Option</option>
                    {input.options.map(opt => (
                      <option key={opt} value={opt}>{opt.toUpperCase()}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={input.placeholder}
                    onChange={(e) => handleChange(input.id, e.target.value)}
                  />
                )}
              </div>
            ))}
            {!command.inputs && (
                <p className="text-slate-300">Are you sure you want to run this command?</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800/50 p-4 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
          >
            Execute
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommandModal;