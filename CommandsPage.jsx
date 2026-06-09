import React, { useState } from 'react';
import { CATEGORIES, ALL_COMMANDS } from './commands';
import CommandModal from './CommandModal';

const CommandsPage = () => {
  const [selectedCommand, setSelectedCommand] = useState(null);

  const handleExecute = (name, data) => {
    console.log(`Executing ${name} with:`, data);
    // Add your socket.emit or API call here
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-12">
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} className="bg-[#111] p-6 rounded-lg border border-slate-800/50">
            <h2 className="text-blue-500 text-xl font-bold mb-4 flex items-center tracking-widest uppercase">
              {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {ALL_COMMANDS.filter(cmd => cmd.category === key).map(cmd => (
                <button
                  key={cmd.name}
                  onClick={() => setSelectedCommand(cmd)}
                  className="flex items-center px-3 py-2 bg-[#161616] border border-slate-800/50 rounded hover:border-blue-600/50 hover:bg-[#202020] transition-all duration-200 group text-left"
                >
                  <span className="text-slate-600 font-bold group-hover:text-blue-500 mr-2 transition-colors">
                    *│*
                  </span>
                  <span className="text-sm tracking-tight text-slate-300 group-hover:text-white">
                    .{cmd.name}
                  </span>
                </button>
              ))}
            </div>
            <div className="text-slate-700 text-xs mt-4 tracking-[0.2em]">
              ┗┅┅┅┅┅┅┅┅┅┅┅➢
            </div>
          </div>
        ))}
      </div>

      <CommandModal 
        command={selectedCommand}
        isOpen={!!selectedCommand}
        onClose={() => setSelectedCommand(null)}
        onExecute={handleExecute}
      />
    </div>
  );
};

export default CommandsPage;