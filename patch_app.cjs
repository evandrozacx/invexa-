const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  /activeTab === "settings"/g,
  'activeTab === "settings" || activeTab === "restore"'
);

// Add the import
const importStatement = 'import BackupRestorePanel from "./components/BackupRestorePanel";\n';
code = code.replace('import SettingsPanel from "./components/SettingsPanel";', 'import SettingsPanel from "./components/SettingsPanel";\n' + importStatement);

// Add the button in the nav
const navButton = `
            <button
              onClick={() => setActiveTab("restore")}
              className={\`w-full px-3.5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-3 \${
                activeTab === "restore" 
                  ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-600/30" 
                  : "text-white hover:text-white hover:bg-slate-900/80"
              }\`}
            >
              <ArchiveRestore className="w-4 h-4 shrink-0 text-slate-300" />
              <span>Backup e Restauração</span>
            </button>
          </nav>
`;
code = code.replace('          </nav>', navButton);

// Ensure ArchiveRestore is imported in App.tsx
if (!code.includes('ArchiveRestore')) {
  code = code.replace('Settings,', 'Settings, ArchiveRestore,');
}

// Add the panel rendering
const renderPanel = `
              {activeTab === "restore" && (
                <BackupRestorePanel
                  onSync={syncState}
                  setActiveTab={setActiveTab}
                />
              )}
            </main>
`;
code = code.replace('            </main>', renderPanel);

// Ensure the type of activeTab is updated in App.tsx state
code = code.replace(
  /const \[activeTab, setActiveTab\] = useState<"inventories" \| "dashboard" \| "imports" \| "reports" \| "settings" \| "simulator" \| "sombra">/g,
  'const [activeTab, setActiveTab] = useState<"inventories" | "dashboard" | "imports" | "reports" | "settings" | "simulator" | "sombra" | "restore">'
);

fs.writeFileSync('src/App.tsx', code);
