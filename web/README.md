# VOID MD Web Interface

## Project Structure

```
web/
├── src/
│   ├── components/
│   │   ├── Modal.js              # Base modal component
│   │   └── FormBuilder.js        # Dynamic form generator
│   ├── pages/
│   │   ├── CommandsPage.js       # Main commands page
│   │   └── commands/
│   │       ├── GroupCommands/
│   │       │   ├── WelcomePage.js
│   │       │   ├── AntiLinkPage.js
│   │       │   └── ...
│   │       ├── DownloadCommands/
│   │       ├── FunCommands/
│   │       └── ...
│   └── utils/
│       └── commandRegistry.js    # Command definitions & helpers
└── index.html                    # Main HTML file
```

## How It Works

### Command Registry (`commandRegistry.js`)
Centralized source of truth for all commands. Each command includes:
- **name**: Command identifier
- **category**: Which menu section it belongs to
- **description**: What the command does
- **pageType**: `'custom'` for custom UI or `'simple'` for generic modal
- **inputs**: Array of form inputs needed

### Modal System
- **Base Modal**: Core functionality for all modals (open/close/render)
- **Generic Modal**: Used for simple commands without custom UI
- **Custom Pages**: Specialized interfaces (Welcome, AntiLink, etc.)

### Form Builder
Dynamically generates form inputs based on command specifications:
- Text inputs
- Textareas
- Select dropdowns
- Radio buttons
- Checkboxes

## Creating a New Custom Command Page

### Step 1: Understand the Command
Analyze how the command works in `case.js`. Example for `antilink`:
```javascript
case "antilink": {
    if (!args[0]) return m.reply("Usage: antilink on/off");
    if (!m.isGroup) return m.reply("This command only works in groups.");

    if (args[0].toLowerCase() === "on") {
        setSetting(m.chat, "antilink", true);
        m.reply('🛡️ AntiLink enabled for this group');
    }
}
```

### Step 2: Define Inputs in Registry
Update `web/src/utils/commandRegistry.js`:
```javascript
antilink: {
    name: "antilink",
    category: "GROUP",
    description: "Configure anti-link settings",
    pageType: "custom",
    inputs: [
        {
            id: "status",
            label: "Status",
            type: "select",
            options: ["on", "off"],
            required: true
        },
        // ... more inputs
    ]
}
```

### Step 3: Create Custom Page Class
Create `web/src/pages/commands/GroupCommands/AntiLinkPage.js`:
```javascript
import { Modal } from '../../../components/Modal.js';

export class AntiLinkPage extends Modal {
    constructor(command, onExecute) {
        super({
            id: 'antilink-modal',
            title: `.${command.name}`,
            width: 'max-w-2xl'
        });
        this.command = command;
        this.onExecute = onExecute;
    }

    render() {
        // Implement custom HTML layout
    }

    open() {
        super.open();
        this.render();
        super.attachEventListeners();
        this.setupFormHandlers();
    }

    setupFormHandlers() {
        // Attach event listeners
    }
}
```

### Step 4: Register in Mappings
Update `web/src/pages/CommandsPage.js`:
```javascript
const PAGE_MAPPINGS = {
    'welcome': WelcomePage,
    'antilink': AntiLinkPage,  // Add here
    'newcommand': NewCommandPage,
};
```

## Form Input Types

### Text Input
```javascript
{
    id: "query",
    label: "Search Query",
    type: "text",
    placeholder: "Enter something...",
    required: true,
    hint: "Optional helper text"
}
```

### Textarea
```javascript
{
    id: "message",
    label: "Message",
    type: "textarea",
    placeholder: "Multi-line text...",
    required: true
}
```

### Select Dropdown
```javascript
{
    id: "option",
    label: "Choose Option",
    type: "select",
    options: ["option1", "option2", "option3"],
    required: true
}
```

### Radio Buttons
```javascript
{
    id: "choice",
    label: "Select One",
    type: "radio",
    options: ["yes", "no", "maybe"],
    default: "yes"
}
```

### Checkbox
```javascript
{
    id: "agree",
    label: "I agree to the terms",
    type: "checkbox",
    default: false
}
```

## Styling Guidelines

### Color Palette
- **Background**: `#0a0a0a`, `#0f172a`, `#111`
- **Primary**: `#3b82f6` (blue-500)
- **Text**: `#e2e8f0` (slate-200), `#64748b` (slate-500)
- **Borders**: `#1e293b` (slate-800), `#1e3a8a` (blue-900)

### Component Classes
- **Modal**: `fixed inset-0 z-50 bg-black/80 backdrop-blur-md`
- **Input**: `bg-slate-800 border border-slate-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500`
- **Button**: `px-4 py-2 rounded-lg font-bold transition`
- **Header**: `text-2xl font-black text-white`

## Best Practices

1. **Always escape user input** to prevent XSS
2. **Validate inputs** before execution
3. **Show loading indicators** during API calls
4. **Provide clear error messages**
5. **Use live previews** where applicable
6. **Keep modals responsive** (mobile-friendly)
7. **Document complex logic** with comments
8. **Test all input combinations**

## API Integration

When saving/executing commands, the data is sent to:
```
POST /api/execute-command
{
    "command": "welcome",
    "params": {
        "message": "Welcome @user",
        "sendViaDM": false,
        "mention": true
    }
}
```

Make sure your backend endpoint handles these parameters correctly.

## Future Enhancements

- [ ] Add command search/filter
- [ ] Add command favorites
- [ ] Add command history
- [ ] Add command scheduling
- [ ] Add dark/light theme toggle
- [ ] Add command documentation modal
- [ ] Add batch command execution
- [ ] Add command templates
