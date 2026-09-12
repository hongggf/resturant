const fs = require('fs');
const file = 'frontend/src/pages/cashier/session.tsx';
let content = fs.readFileSync(file, 'utf8');

// import useVoidLine
content = content.replace(
  'useUpdateLineSelections,\n} from "@/features/sessions/hooks/use-session-rounds"',
  'useUpdateLineSelections,\n  useVoidLine,\n} from "@/features/sessions/hooks/use-session-rounds"'
);

content = content.replace(
  '  const updateSelections = useUpdateLineSelections(sessionId)',
  '  const updateSelections = useUpdateLineSelections(sessionId)\n  const voidLine = useVoidLine(sessionId)\n\n  const [voiding, setVoiding] = useState<{\n    round: CashierRound\n    line: RoundLine\n  } | null>(null)'
);

content = content.replace(
  '              onCancel={setCancelling}',
  '              onCancel={setCancelling}\n              onVoidLine={(r, line) => setVoiding({ round: r, line })}'
);

const originalDialogs = `      <ReasonDialog
        key={\`cancel-\${cancelling?.id ?? "none"}\`}
        open={!!cancelling}
        onOpenChange={(open) => !open && setCancelling(null)}`;

const voidDialog = `      <ReasonDialog
        key={\`void-\${voiding?.line.id ?? "none"}\`}
        open={!!voiding}
        onOpenChange={(open) => !open && setVoiding(null)}
        title="Void item?"
        description={\`Are you sure you want to void \${voiding?.line.nameEn}?\`}
        confirmLabel="Void item"
        pendingLabel="Voiding…"
        pending={voidLine.isPending}
        onConfirm={(reason) => {
          if (!voiding?.round.id || !voiding?.line.id) return
          voidLine.mutate(
            { roundId: voiding.round.id, lineId: voiding.line.id, reason },
            { onSuccess: () => setVoiding(null) }
          )
        }}
      />
`;

content = content.replace(originalDialogs, voidDialog + originalDialogs);

fs.writeFileSync(file, content);
