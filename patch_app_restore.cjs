const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const renderPanel = `
              {activeTab === "restore" && (
                <BackupRestorePanel
                  onSync={syncState}
                  setActiveTab={setActiveTab}
                />
              )}
            </div>
`;
code = code.replace('            </div>\n\n            {/* SPLIT SCREEN ACTIVE SIMULATOR PANEL */}', renderPanel + '\n\n            {/* SPLIT SCREEN ACTIVE SIMULATOR PANEL */}');

fs.writeFileSync('src/App.tsx', code);
