import React, { useState } from 'react';
import { CATEGORIES, ALL_COMMANDS } from './commands';
import CommandModal from './CommandModal';

const CommandsPage = () => {
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async (name, data) => {
    setIsExecuting(true);
    try {
      // Connect to your bot backend here
      // Example: Send command to your WhatsApp bot
      const response = await fetch('/api/execute-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: name, params: data })
      });
      
      if (response.ok) {
        console.log(`✅ Command executed: ${name}`, data);
        alert(`Command "${name}" executed successfully!`);
      } else {
        alert(`❌ Failed to execute command`);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      alert('Connection error. Make sure your bot is running.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCommandClick = (cmd) => {
    setSelectedCommand(cmd);
    // Add analytics or logging here
    console.log(`Selected command: ${cmd.name}`);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="mb-8 border-b border-blue-900/30 pb-6">
          <h1 className="text-4xl font-black text-blue-500 tracking-widest mb-2">
            ❖ VOID MD COMMANDS ❖
          </h1>
          <p className="text-slate-400">Click any command to open its configuration panel</p>
        </div>

        {/* Categories */}
        {Object.entries(CATEGORIES).map(([key, cat]) => (
          <div key={key} className="bg-[#111] p-6 rounded-lg border border-slate-800/50 hover:border-blue-600/30 transition-colors">
            <h2 className="text-blue-500 text-xl font-bold mb-4 flex items-center tracking-widest uppercase">
              {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {ALL_COMMANDS.filter(cmd => cmd.category === key).map(cmd => (
                <button
                  key={cmd.name}
                  onClick={() => handleCommandClick(cmd)}
                  disabled={isExecuting}
                  className="flex items-center px-3 py-2 bg-[#161616] border border-slate-800/50 rounded hover:border-blue-600/50 hover:bg-[#202020] active:bg-blue-600/20 transition-all duration-200 group text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  title={`Execute: ${cmd.name}`}
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

      {/* Modal for command execution */}
      <CommandModal 
        command={selectedCommand}
        isOpen={!!selectedCommand}
        onClose={() => setSelectedCommand(null)}
        onExecute={handleExecute}
      />

      {/* Loading indicator */}
      {isExecuting && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
          Executing command...
        </div>
      )}
    </div>
  );
};

export default CommandsPage;
