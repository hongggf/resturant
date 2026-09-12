const fs = require('fs');
const file = 'frontend/src/pages/cashier/session.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add TransferDialog import
content = content.replace(
  'import { ReasonDialog } from "@/features/sessions/components/reason-dialog"',
  'import { ReasonDialog } from "@/features/sessions/components/reason-dialog"\nimport { TransferDialog } from "@/features/sessions/components/transfer-dialog"'
);

// Add state
content = content.replace(
  '  const [editing, setEditing] = useState<{',
  '  const [transferring, setTransferring] = useState(false)\n  const [editing, setEditing] = useState<{'
);

// Add Move button to header
const headerReplace = `              {tableNumber ? \`Table \${tableNumber}\` : "Session"}
            </h1>
            <p className="text-muted-foreground text-sm">
              {rounds.length === 1 ? "1 round" : \`\${rounds.length} rounds\`} this
              session
              <Button variant="link" className="px-1 h-auto text-sm" onClick={() => setTransferring(true)}>
                (Move)
              </Button>
            </p>`;
            
content = content.replace(
  /              \{tableNumber \? `Table \$\{tableNumber\}` : "Session"\}\n            <\/h1>\n            <p className="text-muted-foreground text-sm">\n              \{rounds.length === 1 \? "1 round" : `\$\{rounds.length\} rounds`\} this\n              session\n            <\/p>/,
  headerReplace
);

// Add TransferDialog render
content = content.replace(
  '      <ReasonDialog',
  `      <TransferDialog
        sessionId={sessionId}
        open={transferring}
        onOpenChange={setTransferring}
      />
      <ReasonDialog`
);

fs.writeFileSync(file, content);
