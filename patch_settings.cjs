const fs = require('fs');
let code = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

// 1. Change the initial state of activeSubTab from 'inventories' to 'companies'
code = code.replace(/const \[activeSubTab, setActiveSubTab\] = useState<"inventories" \| "companies" \| "operators" \| "devices" \| "debug">.*\n/g, 'const [activeSubTab, setActiveSubTab] = useState<"companies" | "operators" | "devices" | "debug">("companies");\n');

// 2. Remove the "Inventários" button from the nav
const buttonToRemove = `          <button
            onClick={() => { setActiveSubTab("inventories"); setFeedback(""); }}
            className={\`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1 \${activeSubTab === "inventories" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500"}\`}
          >
            <Sliders className="w-3.5 h-3.5" /> Inventários
          </button>\n`;
code = code.replace(buttonToRemove, '');

// 3. Optional: we can remove the entire section `{activeSubTab === "inventories" && ( ... )}` but we could just leave it unreachable by the tab to be safe in case we need it later. Let's just leave it there or remove it. It's safer to just make it unreachable. Wait, we should remove it so it doesn't clutter. Let's leave it for now since they only asked to remove from the nav/screen.

fs.writeFileSync('src/components/SettingsPanel.tsx', code);
